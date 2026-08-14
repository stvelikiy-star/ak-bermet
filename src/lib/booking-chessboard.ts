import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type ChessboardState = "free" | "hold" | "booking" | "blocked";

export interface ChessboardRoom {
  readonly id: string;
  readonly building: string;
  readonly roomNumber: string;
  readonly floor: number | null;
  readonly category: string;
  readonly sellableStatus: string;
  readonly operationalStatus: string;
}

export interface ChessboardPeriod {
  readonly id: string;
  readonly roomId: string;
  readonly start: string;
  readonly end: string;
  readonly state: Exclude<ChessboardState, "free">;
  readonly label: string;
  readonly sourceId: string | null;
}

export interface BookingChessboardData {
  readonly rooms: readonly ChessboardRoom[];
  readonly periods: readonly ChessboardPeriod[];
  readonly from: string;
  readonly to: string;
}

export class BookingChessboardError extends Error {
  constructor(public readonly code: "ACCESS_DENIED" | "CONFIGURATION" | "READ_FAILED" | "INVALID_RANGE") {
    super(code);
    this.name = "BookingChessboardError";
  }
}

interface RelationName {
  name?: string | null;
}

interface RoomRow {
  id: string;
  room_number: string;
  floor: number | null;
  sellable_status: string;
  operational_status: string;
  buildings: RelationName | RelationName[] | null;
  room_categories: RelationName | RelationName[] | null;
}

interface OccupancyRow {
  id: string;
  room_unit_id: string;
  period: string;
  period_type: "booking" | "hold" | "maintenance_block" | "stop_sale";
  booking_room_id: string | null;
  availability_hold_id: string | null;
  room_block_id: string | null;
}

interface BookingRelation {
  booking_number?: string | null;
  status?: string | null;
  deleted_at?: string | null;
}

interface BookingRoomRow {
  id: string;
  bookings: BookingRelation | BookingRelation[] | null;
}

interface HoldRow {
  id: string;
  status: string;
  expires_at: string;
}

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const ACTIVE_BOOKING_STATUSES = new Set(["pending_confirmation", "confirmed", "checked_in"]);
const OPERATIONALLY_BLOCKED = new Set(["maintenance_required", "maintenance_in_progress", "blocked"]);

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function parseDateRange(value: string): { start: string; end: string } | null {
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(value);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function daysBetween(from: string, to: string): number {
  if (!isIsoDate(from) || !isIsoDate(to)) return Number.NaN;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function isRoomOperationallyBlocked(room: Pick<ChessboardRoom, "sellableStatus" | "operationalStatus">): boolean {
  return room.sellableStatus !== "active" || OPERATIONALLY_BLOCKED.has(room.operationalStatus);
}

export function periodOverlapsDate(period: Pick<ChessboardPeriod, "start" | "end">, date: string): boolean {
  return period.start <= date && date < period.end;
}

export function chessboardStateForDate(
  room: ChessboardRoom,
  periods: readonly ChessboardPeriod[],
  date: string,
): { state: ChessboardState; label: string } {
  if (isRoomOperationallyBlocked(room)) {
    return { state: "blocked", label: "Технически заблокирован" };
  }

  const active = periods.find((period) => period.roomId === room.id && periodOverlapsDate(period, date));
  if (!active) return { state: "free", label: "Свободно" };
  return { state: active.state, label: active.label };
}

export async function loadBookingChessboard(from: string, to: string): Promise<BookingChessboardData> {
  const dayCount = daysBetween(from, to);
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 31) {
    throw new BookingChessboardError("INVALID_RANGE");
  }

  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) {
    throw new BookingChessboardError("ACCESS_DENIED");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new BookingChessboardError("CONFIGURATION");

  const [roomsResult, occupancyResult] = await Promise.all([
    supabase
      .from("room_units")
      .select(
        "id, room_number, floor, sellable_status, operational_status, buildings ( name ), room_categories ( name )",
      )
      .is("deleted_at", null),
    supabase
      .from("occupancy_periods")
      .select(
        "id, room_unit_id, period, period_type, booking_room_id, availability_hold_id, room_block_id",
      )
      .eq("status", "active"),
  ]);

  if (roomsResult.error || occupancyResult.error || !roomsResult.data || !occupancyResult.data) {
    throw new BookingChessboardError("READ_FAILED");
  }

  const rawOccupancy = occupancyResult.data as OccupancyRow[];
  const bookingRoomIds = rawOccupancy
    .map((row) => row.booking_room_id)
    .filter((value): value is string => Boolean(value));
  const holdIds = rawOccupancy
    .map((row) => row.availability_hold_id)
    .filter((value): value is string => Boolean(value));

  const [bookingRoomsResult, holdsResult] = await Promise.all([
    bookingRoomIds.length
      ? supabase
          .from("booking_rooms")
          .select("id, bookings ( booking_number, status, deleted_at )")
          .in("id", bookingRoomIds)
      : Promise.resolve({ data: [] as BookingRoomRow[], error: null }),
    holdIds.length
      ? supabase
          .from("availability_holds")
          .select("id, status, expires_at")
          .in("id", holdIds)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as HoldRow[], error: null }),
  ]);

  if (bookingRoomsResult.error || holdsResult.error || !bookingRoomsResult.data || !holdsResult.data) {
    throw new BookingChessboardError("READ_FAILED");
  }

  const bookingByRoomRow = new Map<string, BookingRelation>();
  for (const row of bookingRoomsResult.data as BookingRoomRow[]) {
    const booking = firstRelation(row.bookings);
    if (booking) bookingByRoomRow.set(row.id, booking);
  }
  const activeHoldIds = new Set((holdsResult.data as HoldRow[]).map((row) => row.id));

  const rooms: ChessboardRoom[] = (roomsResult.data as RoomRow[])
    .map((row) => ({
      id: row.id,
      building: firstRelation(row.buildings)?.name ?? "Без корпуса",
      roomNumber: row.room_number,
      floor: row.floor,
      category: firstRelation(row.room_categories)?.name ?? "Без категории",
      sellableStatus: row.sellable_status,
      operationalStatus: row.operational_status,
    }))
    .sort((a, b) => a.building.localeCompare(b.building, "ru") || a.roomNumber.localeCompare(b.roomNumber, "ru", { numeric: true }));

  const periods: ChessboardPeriod[] = [];
  for (const row of rawOccupancy) {
    const range = parseDateRange(row.period);
    if (!range || range.end <= from || range.start >= to) continue;

    if (row.period_type === "booking") {
      if (!row.booking_room_id) continue;
      const booking = bookingByRoomRow.get(row.booking_room_id);
      if (!booking || booking.deleted_at || !booking.status || !ACTIVE_BOOKING_STATUSES.has(booking.status)) continue;
      periods.push({
        id: row.id,
        roomId: row.room_unit_id,
        start: range.start,
        end: range.end,
        state: "booking",
        label: booking.booking_number ? `Бронь ${booking.booking_number}` : "Бронь",
        sourceId: row.booking_room_id,
      });
      continue;
    }

    if (row.period_type === "hold") {
      if (!row.availability_hold_id || !activeHoldIds.has(row.availability_hold_id)) continue;
      periods.push({
        id: row.id,
        roomId: row.room_unit_id,
        start: range.start,
        end: range.end,
        state: "hold",
        label: "Удержание",
        sourceId: row.availability_hold_id,
      });
      continue;
    }

    periods.push({
      id: row.id,
      roomId: row.room_unit_id,
      start: range.start,
      end: range.end,
      state: "blocked",
      label: row.period_type === "stop_sale" ? "Стоп-продажа" : "Технический блок",
      sourceId: row.room_block_id,
    });
  }

  return { rooms, periods, from, to };
}
