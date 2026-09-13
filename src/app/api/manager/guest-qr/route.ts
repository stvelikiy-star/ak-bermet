import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createGuestToken, guestPortalUrl, hashGuestToken, isUuidValue } from "@/lib/guest-qr";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

function forbidden() {
  return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
}

function relationFirst<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function getManagerClient() {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return null;
  const client = await createSupabaseServerClient();
  return client ? { staff, client } : null;
}

export async function GET() {
  const auth = await getManagerClient();
  if (!auth) return forbidden();
  const { client } = auth;

  const { data, error } = await client
    .from("guest_room_access_tokens")
    .select("id, room_unit_id, booking_id, label, expires_at, created_at, room_units ( room_number, buildings ( name ) )")
    .not("booking_id", "is", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, code: "QR_READ_FAILED" }, { status: 503 });

  const bookingIds = [...new Set((data ?? []).map((item) => item.booking_id).filter((value): value is string => Boolean(value)))];
  const bookingById = new Map<string, { booking_number: string; check_in: string; check_out: string; guest_name: string }>();

  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingError } = await client
      .from("bookings")
      .select("id, booking_number, check_in, check_out, customers ( full_name )")
      .in("id", bookingIds);
    if (bookingError) return NextResponse.json({ ok: false, code: "QR_BOOKING_READ_FAILED" }, { status: 503 });

    for (const booking of bookings ?? []) {
      const customer = relationFirst(booking.customers as { full_name?: string } | { full_name?: string }[] | null);
      bookingById.set(booking.id, {
        booking_number: booking.booking_number,
        check_in: booking.check_in,
        check_out: booking.check_out,
        guest_name: customer?.full_name ?? "Гость",
      });
    }
  }

  const items = (data ?? []).map((item) => {
    const room = relationFirst(item.room_units as { room_number?: string; buildings?: unknown } | { room_number?: string; buildings?: unknown }[] | null);
    const building = relationFirst(room?.buildings as { name?: string } | { name?: string }[] | null);
    const booking = item.booking_id ? bookingById.get(item.booking_id) : undefined;
    return {
      id: item.id,
      bookingId: item.booking_id,
      bookingNumber: booking?.booking_number ?? "—",
      guestName: booking?.guest_name ?? "Гость",
      checkIn: booking?.check_in ?? "",
      checkOut: booking?.check_out ?? "",
      roomUnitId: item.room_unit_id,
      roomNumber: room?.room_number ?? "—",
      buildingName: building?.name ?? "AK BERMET",
      label: item.label,
      expiresAt: item.expires_at,
      createdAt: item.created_at,
    };
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(request: NextRequest) {
  const auth = await getManagerClient();
  if (!auth) return forbidden();
  const { client } = auth;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId.trim() : "";
  const roomUnitId = typeof payload.roomUnitId === "string" ? payload.roomUnitId.trim() : "";
  const requestedLabel = typeof payload.label === "string" ? payload.label.trim() : "";
  if (!isUuidValue(bookingId) || !isUuidValue(roomUnitId) || requestedLabel.length > 120) {
    return NextResponse.json({ ok: false, code: "INVALID_QR_REQUEST" }, { status: 400 });
  }

  // Reads are RLS-bound to the logged-in manager. The actual token rotation is
  // atomic and role-checked again inside fn_manager_rotate_guest_room_access_token.
  const [{ data: booking, error: bookingError }, { data: room, error: roomError }] = await Promise.all([
    client
      .from("bookings")
      .select("id, booking_number, status, check_in, check_out, customers ( full_name )")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .maybeSingle(),
    client
      .from("room_units")
      .select("id, room_number, buildings ( name )")
      .eq("id", roomUnitId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (bookingError || !booking) return NextResponse.json({ ok: false, code: "BOOKING_NOT_FOUND" }, { status: 404 });
  if (roomError || !room) return NextResponse.json({ ok: false, code: "ROOM_NOT_FOUND" }, { status: 404 });

  const customer = relationFirst(booking.customers as { full_name?: string } | { full_name?: string }[] | null);
  const label = requestedLabel || `${booking.booking_number} · ${customer?.full_name ?? "Гость"} · № ${room.room_number}`;
  const token = createGuestToken();

  const { data, error } = await client.rpc("fn_manager_rotate_guest_room_access_token", {
    p_booking_id: bookingId,
    p_room_unit_id: roomUnitId,
    p_token_hash: hashGuestToken(token),
    p_label: label,
  });

  if (error || !data) {
    const code = error?.message ?? "QR_CREATE_FAILED";
    const status = code.includes("BOOKING_NOT_GUEST_ACTIVE") || code.includes("BOOKING_ROOM_MISMATCH") || code.includes("BOOKING_EXPIRED") ? 409 : 503;
    return NextResponse.json({ ok: false, code: code.match(/BOOKING_[A-Z_]+/)?.[0] ?? "QR_CREATE_FAILED" }, { status });
  }

  const inserted = Array.isArray(data) ? data[0] : data;
  if (!inserted) return NextResponse.json({ ok: false, code: "QR_CREATE_FAILED" }, { status: 503 });

  const url = guestPortalUrl(new URL(request.url).origin, token);
  const qrDataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
  const building = relationFirst(room.buildings as { name?: string } | { name?: string }[] | null);

  return NextResponse.json({
    ok: true,
    item: {
      id: inserted.token_id,
      bookingId: inserted.booking_id,
      bookingNumber: booking.booking_number,
      guestName: customer?.full_name ?? "Гость",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      roomUnitId: inserted.room_unit_id,
      roomNumber: room.room_number,
      buildingName: building?.name ?? "AK BERMET",
      label: inserted.label,
      expiresAt: inserted.expires_at,
      createdAt: inserted.created_at,
      url,
      qrDataUrl,
    },
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getManagerClient();
  if (!auth) return forbidden();

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!isUuidValue(id)) return NextResponse.json({ ok: false, code: "INVALID_QR_ID" }, { status: 400 });

  const { data, error } = await auth.client.rpc("fn_manager_revoke_guest_room_access_token", {
    p_token_id: id,
  });
  if (error) return NextResponse.json({ ok: false, code: "QR_REVOKE_FAILED" }, { status: 503 });
  if (data !== true) return NextResponse.json({ ok: false, code: "QR_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
