import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { isIsoDate } from "@/lib/booking-chessboard-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const BLOCKED_OPERATIONAL = new Set(["maintenance_required", "maintenance_in_progress", "blocked"]);
const MOVABLE_BOOKING_STATUSES = new Set(["pending_confirmation", "confirmed"]);

type PlacementMode = "preview" | "commit";

interface PlacementPayload {
  mode: PlacementMode;
  bookingRoomId: string;
  targetRoomUnitId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}

interface BookingRelation {
  booking_number?: string | null;
  status?: string | null;
  deleted_at?: string | null;
}

interface BookingRoomRow {
  id: string;
  booking_id: string;
  room_unit_id: string;
  adults: number;
  children: number;
  extra_beds: number;
  status: string;
  bookings: BookingRelation | BookingRelation[] | null;
}

interface RoomRow {
  id: string;
  room_number: string;
  max_capacity: number;
  extra_places: number;
  sellable_status: string;
  operational_status: string;
}

interface OccupancyRow {
  booking_room_id: string | null;
  period_type: string;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePayload(value: unknown): PlacementPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const mode = input.mode === "preview" || input.mode === "commit" ? input.mode : null;
  const bookingRoomId = typeof input.bookingRoomId === "string" ? input.bookingRoomId.trim() : "";
  const targetRoomUnitId = typeof input.targetRoomUnitId === "string" ? input.targetRoomUnitId.trim() : "";
  const checkIn = typeof input.checkIn === "string" ? input.checkIn.trim() : "";
  const checkOut = typeof input.checkOut === "string" ? input.checkOut.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";

  if (!mode || !isUuid(bookingRoomId) || !isUuid(targetRoomUnitId)) return null;
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) return null;
  if (reason.length > 1000) return null;

  return { mode, bookingRoomId, targetRoomUnitId, checkIn, checkOut, reason };
}

function publicRpcError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "23P01") return { status: 409, code: "ROOM_UNAVAILABLE" };
  if (error.code === "42501") return { status: 403, code: "ACCESS_DENIED" };
  if (error.code === "22023") {
    const known = new Set([
      "invalid_booking_dates",
      "booking_room_not_found",
      "booking_not_found",
      "booking_move_status_not_allowed",
      "room_not_found",
      "room_not_sellable",
      "room_operationally_blocked",
      "room_capacity_exceeded",
      "extra_bed_capacity_exceeded",
    ]);
    const message = error.message ?? "";
    return { status: 400, code: known.has(message) ? message.toUpperCase() : "INVALID_PLACEMENT" };
  }
  return { status: 500, code: "PLACEMENT_FAILED" };
}

export async function POST(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) {
    return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const payload = parsePayload(raw);
  if (!payload) {
    return NextResponse.json({ ok: false, code: "INVALID_PLACEMENT" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "AUTH_CONFIGURATION" }, { status: 503 });
  }

  if (payload.mode === "commit") {
    const { data, error } = await supabase.rpc("fn_move_booking_room", {
      p_booking_room_id: payload.bookingRoomId,
      p_target_room_unit_id: payload.targetRoomUnitId,
      p_check_in: payload.checkIn,
      p_check_out: payload.checkOut,
      p_reason: payload.reason || null,
    });

    if (error) {
      const safe = publicRpcError(error);
      return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.booking_room_id) {
      return NextResponse.json({ ok: false, code: "PLACEMENT_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      committed: true,
      placement: {
        bookingId: row.booking_id,
        bookingRoomId: row.booking_room_id,
        roomUnitId: row.room_unit_id,
        checkIn: row.check_in,
        checkOut: row.check_out,
      },
    });
  }

  const [bookingRoomResult, targetRoomResult] = await Promise.all([
    supabase
      .from("booking_rooms")
      .select("id, booking_id, room_unit_id, adults, children, extra_beds, status, bookings ( booking_number, status, deleted_at )")
      .eq("id", payload.bookingRoomId)
      .maybeSingle(),
    supabase
      .from("room_units")
      .select("id, room_number, max_capacity, extra_places, sellable_status, operational_status")
      .eq("id", payload.targetRoomUnitId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (bookingRoomResult.error || targetRoomResult.error) {
    return NextResponse.json({ ok: false, code: "READ_FAILED" }, { status: 500 });
  }

  const bookingRoom = bookingRoomResult.data as BookingRoomRow | null;
  const targetRoom = targetRoomResult.data as RoomRow | null;
  const booking = first(bookingRoom?.bookings);

  if (!bookingRoom || bookingRoom.status !== "active" || !booking || booking.deleted_at) {
    return NextResponse.json({ ok: false, code: "BOOKING_ROOM_NOT_FOUND" }, { status: 404 });
  }
  if (!booking.status || !MOVABLE_BOOKING_STATUSES.has(booking.status)) {
    return NextResponse.json({ ok: false, code: "BOOKING_MOVE_STATUS_NOT_ALLOWED" }, { status: 409 });
  }
  if (!targetRoom) {
    return NextResponse.json({ ok: false, code: "ROOM_NOT_FOUND" }, { status: 404 });
  }
  if (targetRoom.sellable_status !== "active") {
    return NextResponse.json({ ok: true, available: false, code: "ROOM_NOT_SELLABLE" });
  }
  if (BLOCKED_OPERATIONAL.has(targetRoom.operational_status)) {
    return NextResponse.json({ ok: true, available: false, code: "ROOM_OPERATIONALLY_BLOCKED" });
  }
  if (bookingRoom.adults + bookingRoom.children > targetRoom.max_capacity) {
    return NextResponse.json({ ok: true, available: false, code: "ROOM_CAPACITY_EXCEEDED" });
  }
  if (bookingRoom.extra_beds > targetRoom.extra_places) {
    return NextResponse.json({ ok: true, available: false, code: "EXTRA_BED_CAPACITY_EXCEEDED" });
  }

  const occupancyResult = await supabase
    .from("occupancy_periods")
    .select("booking_room_id, period_type")
    .eq("room_unit_id", payload.targetRoomUnitId)
    .eq("status", "active")
    .overlaps("period", `[${payload.checkIn},${payload.checkOut})`);

  if (occupancyResult.error || !occupancyResult.data) {
    return NextResponse.json({ ok: false, code: "READ_FAILED" }, { status: 500 });
  }

  const conflicts = (occupancyResult.data as OccupancyRow[]).filter(
    (row) => row.booking_room_id !== payload.bookingRoomId,
  );

  if (conflicts.length > 0) {
    return NextResponse.json({
      ok: true,
      available: false,
      code: "ROOM_UNAVAILABLE",
      conflicts: conflicts.map((row) => row.period_type),
    });
  }

  return NextResponse.json({
    ok: true,
    available: true,
    preview: {
      bookingNumber: booking.booking_number ?? "",
      targetRoomNumber: targetRoom.room_number,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
    },
  });
}
