import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createGuestToken, guestPortalUrl, hashGuestToken, isUuidValue } from "@/lib/guest-qr";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const GUEST_ACTIVE_BOOKING_STATUSES = new Set(["confirmed", "checked_in"]);
function forbidden() { return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 }); }
function relationFirst<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
function checkoutExpiry(checkOut: string): Date | null {
  const value = new Date(`${checkOut}T13:00:00+06:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}
export async function GET() {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("guest_room_access_tokens")
    .select("id, room_unit_id, booking_id, label, expires_at, created_at, room_units ( room_number, buildings ( name ) )")
    .not("booking_id", "is", null)
    .is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, code: "QR_READ_FAILED" }, { status: 503 });

  const bookingIds = [...new Set((data ?? []).map((item) => item.booking_id).filter((value): value is string => Boolean(value)))];
  const bookingById = new Map<string, { booking_number: string; check_in: string; check_out: string; guest_name: string }>();
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingError } = await admin
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
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId.trim() : "";
  const roomUnitId = typeof payload.roomUnitId === "string" ? payload.roomUnitId.trim() : "";
  const requestedLabel = typeof payload.label === "string" ? payload.label.trim() : "";
  if (!isUuidValue(bookingId) || !isUuidValue(roomUnitId) || requestedLabel.length > 120) {
    return NextResponse.json({ ok: false, code: "INVALID_QR_REQUEST" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, booking_number, status, check_in, check_out, customers ( full_name )")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (bookingError || !booking) return NextResponse.json({ ok: false, code: "BOOKING_NOT_FOUND" }, { status: 404 });
  if (!GUEST_ACTIVE_BOOKING_STATUSES.has(booking.status)) {
    return NextResponse.json({ ok: false, code: "BOOKING_NOT_GUEST_ACTIVE" }, { status: 409 });
  }
  const expiresAt = checkoutExpiry(booking.check_out);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, code: "BOOKING_EXPIRED" }, { status: 409 });
  }

  const { data: assignment, error: assignmentError } = await admin
    .from("booking_rooms")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("room_unit_id", roomUnitId)
    .maybeSingle();
  if (assignmentError || !assignment) {
    return NextResponse.json({ ok: false, code: "BOOKING_ROOM_MISMATCH" }, { status: 409 });
  }

  const { data: room, error: roomError } = await admin.from("room_units")
    .select("id, room_number, buildings ( name )")
    .eq("id", roomUnitId).is("deleted_at", null).maybeSingle();
  if (roomError || !room) return NextResponse.json({ ok: false, code: "ROOM_NOT_FOUND" }, { status: 404 });

  const customer = relationFirst(booking.customers as { full_name?: string } | { full_name?: string }[] | null);
  const label = requestedLabel || `${booking.booking_number} · ${customer?.full_name ?? "Гость"} · № ${room.room_number}`;
  const rotationTime = new Date().toISOString();
  const { data: revokedRows, error: revokeError } = await admin
    .from("guest_room_access_tokens")
    .update({ revoked_at: rotationTime })
    .eq("booking_id", bookingId)
    .is("revoked_at", null)
    .select("id");
  if (revokeError) return NextResponse.json({ ok: false, code: "QR_ROTATION_FAILED" }, { status: 503 });

  const token = createGuestToken();
  const { data: inserted, error } = await admin
    .from("guest_room_access_tokens")
    .insert({
      booking_id: bookingId,
      room_unit_id: roomUnitId,
      token_hash: hashGuestToken(token),
      label,
      expires_at: expiresAt.toISOString(),
      created_by: staff?.userId ?? null,
    })
    .select("id, booking_id, room_unit_id, label, expires_at, created_at")
    .single();

  if (error || !inserted) {
    const revokedIds = (revokedRows ?? []).map((row) => row.id).filter(Boolean);
    if (revokedIds.length > 0) {
      await admin.from("guest_room_access_tokens").update({ revoked_at: null }).in("id", revokedIds);
    }
    return NextResponse.json({ ok: false, code: "QR_CREATE_FAILED" }, { status: 503 });
  }
  const url = guestPortalUrl(new URL(request.url).origin, token);
  const qrDataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
  const building = relationFirst(room.buildings as { name?: string } | { name?: string }[] | null);
  return NextResponse.json({
    ok: true,
    item: {
      id: inserted.id,
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
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!isUuidValue(id)) return NextResponse.json({ ok: false, code: "INVALID_QR_ID" }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from("guest_room_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) return NextResponse.json({ ok: false, code: "QR_REVOKE_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
