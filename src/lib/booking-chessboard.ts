import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type ChessboardState = "free" | "hold" | "occupied" | "blocked";

export interface ChessboardRoom {
  id: string;
  roomNumber: string;
  buildingName: string;
  sellableStatus: string;
  operationalStatus: string;
}

export interface ChessboardOccupancy {
  roomUnitId: string;
  start: string;
  endExclusive: string;
  state: Exclude<ChessboardState, "free">;
  label: string;
}

export interface BookingChessboardData {
  rooms: ChessboardRoom[];
  occupancies: ChessboardOccupancy[];
}

type RawRange = string;

function parseDateRange(value: RawRange): { start: string; endExclusive: string } | null {
  const match = /^\[([^,]+),([^\)]+)\)$/.exec(value);
  if (!match) return null;
  return { start: match[1], endExclusive: match[2] };
}

function buildingName(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0] as { name?: unknown } | undefined;
    return typeof first?.name === "string" ? first.name : "Без корпуса";
  }
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "Без корпуса";
}

export async function loadBookingChessboard(
  start: string,
  endExclusive: string,
): Promise<BookingChessboardData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rooms: [], occupancies: [] };

  const [roomsResult, occupancyResult] = await Promise.all([
    supabase
      .from("room_units")
      .select("id,room_number,sellable_status,operational_status,buildings(name)")
      .is("deleted_at", null)
      .order("room_number"),
    supabase
      .from("occupancy_periods")
      .select("room_unit_id,period,period_type,status,booking_room_id")
      .eq("status", "active")
      .lt("period", `[${endExclusive},)`),
  ]);

  if (roomsResult.error || occupancyResult.error) {
    return { rooms: [], occupancies: [] };
  }

  const rooms: ChessboardRoom[] = (roomsResult.data ?? []).map((row) => ({
    id: String(row.id),
    roomNumber: String(row.room_number),
    buildingName: buildingName(row.buildings),
    sellableStatus: String(row.sellable_status),
    operationalStatus: String(row.operational_status),
  }));

  const bookingRoomIds = (occupancyResult.data ?? [])
    .map((row) => row.booking_room_id)
    .filter((value): value is string => typeof value === "string");

  const bookingLabels = new Map<string, string>();
  if (bookingRoomIds.length > 0) {
    const bookingRooms = await supabase
      .from("booking_rooms")
      .select("id,bookings(booking_number,status)")
      .in("id", bookingRoomIds);

    if (!bookingRooms.error) {
      for (const row of bookingRooms.data ?? []) {
        const nested = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
        const booking = nested as { booking_number?: unknown; status?: unknown } | null;
        const number = typeof booking?.booking_number === "string" ? booking.booking_number : "Бронь";
        const status = typeof booking?.status === "string" ? booking.status : "";
        bookingLabels.set(String(row.id), status ? `${number} · ${status}` : number);
      }
    }
  }

  const occupancies: ChessboardOccupancy[] = [];
  for (const row of occupancyResult.data ?? []) {
    if (typeof row.period !== "string") continue;
    const parsed = parseDateRange(row.period);
    if (!parsed) continue;
    if (parsed.endExclusive <= start || parsed.start >= endExclusive) continue;

    const type = String(row.period_type);
    const state: Exclude<ChessboardState, "free"> =
      type === "booking" ? "occupied" : type === "hold" ? "hold" : "blocked";
    const bookingRoomId = typeof row.booking_room_id === "string" ? row.booking_room_id : null;
    const label =
      state === "occupied" && bookingRoomId
        ? bookingLabels.get(bookingRoomId) ?? "Бронь"
        : state === "hold"
          ? "Удержание"
          : type === "stop_sale"
            ? "Stop sale"
            : "Техблок";

    occupancies.push({
      roomUnitId: String(row.room_unit_id),
      start: parsed.start,
      endExclusive: parsed.endExclusive,
      state,
      label,
    });
  }

  for (const room of rooms) {
    if (room.sellableStatus !== "active" || room.operationalStatus !== "ready") {
      occupancies.push({
        roomUnitId: room.id,
        start,
        endExclusive,
        state: "blocked",
        label: room.sellableStatus !== "active" ? "Не продаётся" : room.operationalStatus,
      });
    }
  }

  return { rooms, occupancies };
}
