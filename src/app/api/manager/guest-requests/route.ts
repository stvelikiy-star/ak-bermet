import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const STATUSES = new Set(["new", "acknowledged", "in_progress", "resolved", "cancelled"]);

function forbidden() {
  return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
}
function relationFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
function normalizeItem(item: any) {
  const room = relationFirst(item.room_units);
  const building = room && relationFirst(room.buildings);
  const booking = relationFirst(item.bookings);
  const customer = booking && relationFirst(booking.customers);
  return {
    id: item.id,
    bookingId: item.booking_id,
    bookingNumber: booking?.booking_number ?? "—",
    guestName: customer?.full_name ?? "Гость",
    roomNumber: room?.room_number ?? "—",
    buildingName: building?.name ?? "AK BERMET",
    requestType: item.request_type,
    message: item.message,
    status: item.status,
    createdAt: item.created_at,
  };
}

export async function GET() {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();

  const { data, error } = await getSupabaseAdminClient()
    .from("guest_service_requests")
    .select("id, booking_id, room_unit_id, request_type, message, status, created_at, bookings ( booking_number, customers ( full_name ) ), room_units ( room_number, buildings ( name ) )")
    .not("status", "in", "(resolved,cancelled)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, code: "GUEST_REQUESTS_READ_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true, items: (data ?? []).map(normalizeItem) });
}

export async function PATCH(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.has(status)) {
    return NextResponse.json({ ok: false, code: "INVALID_GUEST_REQUEST_UPDATE" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, string | null> = { status };
  if (status === "new") {
    patch.acknowledged_at = null;
    patch.resolved_at = null;
  } else if (status === "resolved" || status === "cancelled") {
    patch.acknowledged_at = now;
    patch.resolved_at = now;
  } else {
    patch.acknowledged_at = now;
    patch.resolved_at = null;
  }

  const { error } = await getSupabaseAdminClient()
    .from("guest_service_requests")
    .update(patch)
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, code: "GUEST_REQUEST_UPDATE_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
