import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  BookingChessboardError,
  daysBetween,
  parseDateRange,
  type BookingChessboardData,
  type BookingServiceOption,
  type ChessboardBookingService,
  type ChessboardPeriod,
  type ChessboardRoom,
} from "@/lib/booking-chessboard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

interface RelationName {
  name?: string | null;
}

interface CustomerRelation {
  full_name?: string | null;
  phone?: string | null;
}

interface RoomRow {
  id: string;
  room_number: string;
  floor: number | null;
  max_capacity: number;
  extra_places: number;
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
  id?: string | null;
  booking_number?: string | null;
  status?: string | null;
  total_amount_kgs?: number | string | null;
  prepayment_required_kgs?: number | string | null;
  notes?: string | null;
  deleted_at?: string | null;
  customers?: CustomerRelation | CustomerRelation[] | null;
}

interface BookingRoomRow {
  id: string;
  booking_id: string;
  adults: number;
  children: number;
  extra_beds: number;
  bookings: BookingRelation | BookingRelation[] | null;
}

interface HoldRow {
  id: string;
  status: string;
  expires_at: string;
}

interface ServiceCatalogRow {
  id: string;
  code: string;
  name: string;
  category: string;
  pricing_mode: "fixed" | "manual";
  price_kgs: number | string | null;
  unit_label: string;
  sort_order: number;
}

interface ServiceRelation {
  code?: string | null;
  unit_label?: string | null;
}

interface BookingServiceRow {
  id: string;
  booking_id: string;
  service_name_snapshot: string;
  quantity: number | string;
  unit_price_kgs: number | string;
  total_amount_kgs: number | string;
  scheduled_for: string | null;
  status: string;
  service_catalog: ServiceRelation | ServiceRelation[] | null;
}

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const ACTIVE_BOOKING_STATUSES = new Set([
  "pending_confirmation",
  "confirmed",
  "checked_in",
]);

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function number(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadBookingChessboard(
  from: string,
  to: string,
): Promise<BookingChessboardData> {
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

  const [roomsResult, occupancyResult, serviceCatalogResult] = await Promise.all([
    supabase
      .from("room_units")
      .select(
        "id, room_number, floor, max_capacity, extra_places, sellable_status, operational_status, buildings ( name ), room_categories ( name )",
      )
      .is("deleted_at", null),
    supabase
      .from("occupancy_periods")
      .select(
        "id, room_unit_id, period, period_type, booking_room_id, availability_hold_id, room_block_id",
      )
      .eq("status", "active")
      .overlaps("period", `[${from},${to})`),
    supabase
      .from("service_catalog")
      .select(
        "id, code, name, category, pricing_mode, price_kgs, unit_label, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (
    roomsResult.error ||
    occupancyResult.error ||
    serviceCatalogResult.error ||
    !roomsResult.data ||
    !occupancyResult.data ||
    !serviceCatalogResult.data
  ) {
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
          .select(
            "id, booking_id, adults, children, extra_beds, bookings ( id, booking_number, status, total_amount_kgs, prepayment_required_kgs, notes, deleted_at, customers ( full_name, phone ) )",
          )
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

  if (
    bookingRoomsResult.error ||
    holdsResult.error ||
    !bookingRoomsResult.data ||
    !holdsResult.data
  ) {
    throw new BookingChessboardError("READ_FAILED");
  }

  const bookingRoomRows = bookingRoomsResult.data as BookingRoomRow[];
  const bookingIds = [
    ...new Set(bookingRoomRows.map((row) => row.booking_id).filter(Boolean)),
  ];
  const bookingServicesResult = bookingIds.length
    ? await supabase
        .from("booking_services")
        .select(
          "id, booking_id, service_name_snapshot, quantity, unit_price_kgs, total_amount_kgs, scheduled_for, status, service_catalog ( code, unit_label )",
        )
        .in("booking_id", bookingIds)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true })
    : { data: [] as BookingServiceRow[], error: null };

  if (bookingServicesResult.error || !bookingServicesResult.data) {
    throw new BookingChessboardError("READ_FAILED");
  }

  const servicesByBooking = new Map<string, ChessboardBookingService[]>();
  for (const row of bookingServicesResult.data as BookingServiceRow[]) {
    const relation = firstRelation(row.service_catalog);
    const current = servicesByBooking.get(row.booking_id) ?? [];
    current.push({
      id: row.id,
      code: relation?.code ?? "OTHER",
      name: row.service_name_snapshot,
      quantity: number(row.quantity),
      unitPriceKgs: number(row.unit_price_kgs),
      totalAmountKgs: number(row.total_amount_kgs),
      unitLabel: relation?.unit_label ?? "услуга",
      scheduledFor: row.scheduled_for,
      status: row.status,
    });
    servicesByBooking.set(row.booking_id, current);
  }

  const bookingByRoomRow = new Map<string, BookingRoomRow>();
  for (const row of bookingRoomRows) bookingByRoomRow.set(row.id, row);
  const activeHoldIds = new Set(
    (holdsResult.data as HoldRow[]).map((row) => row.id),
  );

  const rooms: ChessboardRoom[] = (roomsResult.data as RoomRow[])
    .map((row) => ({
      id: row.id,
      building: firstRelation(row.buildings)?.name ?? "Без корпуса",
      roomNumber: row.room_number,
      floor: row.floor,
      category: firstRelation(row.room_categories)?.name ?? "Без категории",
      sellableStatus: row.sellable_status,
      operationalStatus: row.operational_status,
      maxCapacity: row.max_capacity,
      extraPlaces: row.extra_places,
    }))
    .sort(
      (a, b) =>
        a.building.localeCompare(b.building, "ru") ||
        a.roomNumber.localeCompare(b.roomNumber, "ru", { numeric: true }),
    );

  const periods: ChessboardPeriod[] = [];
  for (const row of rawOccupancy) {
    const range = parseDateRange(row.period);
    if (!range || range.end <= from || range.start >= to) continue;

    if (row.period_type === "booking") {
      if (!row.booking_room_id) continue;
      const bookingRoom = bookingByRoomRow.get(row.booking_room_id);
      const booking = firstRelation(bookingRoom?.bookings);
      if (
        !bookingRoom ||
        !booking ||
        booking.deleted_at ||
        !booking.status ||
        !ACTIVE_BOOKING_STATUSES.has(booking.status) ||
        !booking.id
      ) {
        continue;
      }
      const customer = firstRelation(booking.customers);
      const guestName =
        customer?.full_name?.trim() || booking.booking_number || "Гость";
      periods.push({
        id: row.id,
        roomId: row.room_unit_id,
        start: range.start,
        end: range.end,
        state: "booking",
        label: `${guestName}${booking.booking_number ? ` · ${booking.booking_number}` : ""}`,
        sourceId: row.booking_room_id,
        booking: {
          bookingId: booking.id,
          bookingRoomId: bookingRoom.id,
          bookingNumber: booking.booking_number ?? "",
          status: booking.status,
          guestName,
          guestPhone: customer?.phone ?? "",
          adults: bookingRoom.adults,
          children: bookingRoom.children,
          extraBeds: bookingRoom.extra_beds,
          totalAmountKgs: number(booking.total_amount_kgs),
          prepaymentRequiredKgs: number(booking.prepayment_required_kgs),
          notes: booking.notes ?? null,
          services: servicesByBooking.get(booking.id) ?? [],
        },
      });
      continue;
    }

    if (row.period_type === "hold") {
      if (
        !row.availability_hold_id ||
        !activeHoldIds.has(row.availability_hold_id)
      ) {
        continue;
      }
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
      label:
        row.period_type === "stop_sale"
          ? "Стоп-продажа"
          : "Технический блок",
      sourceId: row.room_block_id,
    });
  }

  const serviceCatalog: BookingServiceOption[] = (
    serviceCatalogResult.data as ServiceCatalogRow[]
  ).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    pricingMode: row.pricing_mode,
    priceKgs: row.price_kgs === null ? null : number(row.price_kgs),
    unitLabel: row.unit_label,
  }));

  return { rooms, periods, serviceCatalog, from, to };
}
