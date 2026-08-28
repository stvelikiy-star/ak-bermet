import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OccupancyRecord, RoomUnit } from "@/types/availability";

// Серверный клиент Supabase (Operational CRM).
// ВАЖНО: использует Service Role ключ — импортировать этот модуль
// можно только из серверного кода (route handlers), никогда из
// клиентских компонентов ("use client"). Ключ даёт доступ в обход RLS,
// поэтому вызывающий route обязан сам проверить аутентифицированного
// активного сотрудника и его роль до любой записи.

type SupabaseEnv = { url: string; serviceRoleKey: string };

function getSupabaseEnv(): SupabaseEnv | null {
  // URL не секрет (используется и в браузерном клиенте), поэтому общий с
  // NEXT_PUBLIC_SUPABASE_URL — секретность обеспечивает только ключ ниже.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase credentials are not configured");
  }
  if (!cachedClient) {
    cachedClient = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

export interface CreateAvailabilityHoldRpcInput {
  roomUnitId: string;
  checkIn: string;
  checkOut: string;
  heldBy: string;
  leadId?: string | null;
  idempotencyKey?: string | null;
}

// Application-facing shape. The database stores the dates in a PostgreSQL
// daterange; this normalized shape is what the availability API consumes.
export interface AvailabilityHoldRpcRow {
  id: string;
  room_unit_id: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at?: string;
  expires_at?: string;
  // Legacy API compatibility only. The durable availability_holds table uses
  // expires_at; no new database read populates hold_expires_at.
  hold_expires_at?: string;
  idempotency_key?: string;
  [key: string]: unknown;
}

interface AvailabilityHoldDbRow {
  id: string;
  room_unit_id: string;
  date_range: string;
  status: string;
  created_at?: string;
  expires_at?: string;
  idempotency_key?: string;
  [key: string]: unknown;
}

function normalizeAvailabilityHoldRow(
  row: AvailabilityHoldDbRow
): AvailabilityHoldRpcRow | null {
  // fn_create_availability_hold always constructs [check_in, check_out).
  // PostgreSQL serializes a date daterange in the same canonical form.
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(
    row.date_range
  );
  if (!match) return null;
  const [, checkIn, checkOut] = match;
  return {
    id: row.id,
    room_unit_id: row.room_unit_id,
    check_in: checkIn,
    check_out: checkOut,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    idempotency_key: row.idempotency_key,
  };
}

export class AvailabilityHoldReadError extends Error {
  constructor() {
    super("Availability holds read failed");
    this.name = "AvailabilityHoldReadError";
  }
}

export interface AvailabilityHoldReadClient {
  from(name: "availability_holds"): {
    select(columns: string): {
      eq(column: "status", value: "active"): {
        gt(
          column: "expires_at",
          value: string
        ): Promise<{
          data: AvailabilityHoldDbRow[] | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
}

// Availability GET consults the exact same durable table written by
// fn_create_availability_hold. A read failure or malformed daterange fails
// closed rather than pretending a held room is available.
export async function listActiveAvailabilityHolds(
  now: Date = new Date(),
  client: AvailabilityHoldReadClient =
    getSupabaseAdminClient() as unknown as AvailabilityHoldReadClient
): Promise<AvailabilityHoldRpcRow[]> {
  const { data, error } = await client
    .from("availability_holds")
    .select(
      "id, room_unit_id, date_range, status, created_at, expires_at, idempotency_key"
    )
    .eq("status", "active")
    .gt("expires_at", now.toISOString());

  if (error || !data) throw new AvailabilityHoldReadError();
  const normalized = data.map(normalizeAvailabilityHoldRow);
  if (normalized.some((row) => row === null)) {
    throw new AvailabilityHoldReadError();
  }
  return normalized as AvailabilityHoldRpcRow[];
}

export interface AvailabilityHoldRpcClient {
  rpc(
    name: "fn_create_availability_hold",
    params: {
      p_room_unit_id: string;
      p_check_in: string;
      p_check_out: string;
      p_held_by: string;
      p_lead_id: string | null;
      p_idempotency_key: string | null;
    }
  ): Promise<{
    data: AvailabilityHoldDbRow | AvailabilityHoldDbRow[] | null;
    error: { code?: string; message?: string } | null;
  }>;
}

export class AvailabilityHoldRpcError extends Error {
  constructor(public readonly code: string | undefined) {
    super("Availability hold RPC failed");
    this.name = "AvailabilityHoldRpcError";
  }
}

export function availabilityHoldRpcHttpStatus(code: string | undefined): number {
  switch (code) {
    case "AKB01":
      return 400;
    case "AKB02":
    case "23P01":
      return 409;
    case "AKB03":
      return 404;
    default:
      return 503;
  }
}

// Единственный writable admin-RPC в этом модуле. Атомарность, overlap
// и idempotency обеспечивает существующая функция БД. heldBy должен
// быть получен вызывающим route только из проверенной server-side сессии.
export async function createAvailabilityHoldRpc(
  input: CreateAvailabilityHoldRpcInput,
  client?: AvailabilityHoldRpcClient
): Promise<AvailabilityHoldRpcRow> {
  // SupabaseClient.rpc is generated as a broader generic signature; this
  // narrow interface documents and constrains the only RPC used here.
  const rpcClient =
    client ?? (getSupabaseAdminClient() as unknown as AvailabilityHoldRpcClient);
  const { data, error } = await rpcClient.rpc("fn_create_availability_hold", {
    p_room_unit_id: input.roomUnitId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_held_by: input.heldBy,
    p_lead_id: input.leadId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  });

  if (error) throw new AvailabilityHoldRpcError(error.code);
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) throw new AvailabilityHoldRpcError(undefined);
  const row = normalizeAvailabilityHoldRow(raw);
  if (!row) throw new AvailabilityHoldRpcError(undefined);
  return row;
}

interface PublicAvailabilityRelationName {
  name?: string | null;
}

interface PublicAvailabilityRoomRow {
  id: string;
  room_number: string;
  floor: number | null;
  max_capacity: number;
  extra_places: number;
  view_side: string;
  has_wifi: boolean;
  distance_to_spa_meters: number | null;
  distance_to_beach_meters: number | null;
  sellable_status: string;
  operational_status: string;
  notes: string | null;
  buildings: PublicAvailabilityRelationName | PublicAvailabilityRelationName[] | null;
  room_categories: PublicAvailabilityRelationName | PublicAvailabilityRelationName[] | null;
}

interface PublicAvailabilityOccupancyRow {
  id: string;
  room_unit_id: string;
  period: string;
  period_type: "booking" | "hold" | "maintenance_block" | "stop_sale";
  availability_hold_id: string | null;
}

export class PublicAvailabilityReadError extends Error {
  constructor() {
    super("Authoritative public availability read failed");
    this.name = "PublicAvailabilityReadError";
  }
}

function firstPublicAvailabilityRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function parsePublicAvailabilityPeriod(period: string): { checkIn: string; checkOut: string } | null {
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(period);
  if (!match) return null;
  return { checkIn: match[1], checkOut: match[2] };
}

export async function loadAuthoritativeAvailability(
  now: Date = new Date(),
  client: SupabaseClient = getSupabaseAdminClient()
): Promise<{ rooms: RoomUnit[]; occupancy: OccupancyRecord[] }> {
  const [roomsResult, occupancyResult, activeHolds] = await Promise.all([
    client
      .from("room_units")
      .select(
        "id, room_number, floor, max_capacity, extra_places, view_side, has_wifi, distance_to_spa_meters, distance_to_beach_meters, sellable_status, operational_status, notes, buildings ( name ), room_categories ( name )"
      )
      .is("deleted_at", null),
    client
      .from("occupancy_periods")
      .select("id, room_unit_id, period, period_type, availability_hold_id")
      .eq("status", "active"),
    listActiveAvailabilityHolds(
      now,
      client as unknown as AvailabilityHoldReadClient
    ),
  ]);

  if (
    roomsResult.error ||
    occupancyResult.error ||
    !roomsResult.data ||
    !occupancyResult.data
  ) {
    throw new PublicAvailabilityReadError();
  }

  const activeHoldById = new Map(activeHolds.map((hold) => [hold.id, hold]));

  const rooms: RoomUnit[] = (
    roomsResult.data as unknown as PublicAvailabilityRoomRow[]
  ).map((row) => {
    const status: RoomUnit["status"] =
      row.sellable_status !== "active"
        ? "do_not_sell"
        : row.operational_status === "ready"
          ? "active"
          : "maintenance";
    const view: RoomUnit["view"] =
      row.view_side === "preferred_nature"
        ? "forest"
        : row.view_side === "service_yard"
          ? "yard"
          : "other";

    return {
      id: row.id,
      building:
        firstPublicAvailabilityRelation(row.buildings)?.name ?? "Без корпуса",
      floor: row.floor ?? undefined,
      roomNumber: row.room_number,
      category:
        firstPublicAvailabilityRelation(row.room_categories)?.name ??
        "Без категории",
      capacity: row.max_capacity,
      allowsExtraBed: row.extra_places > 0,
      view,
      hasWifi: row.has_wifi,
      distanceToSpaMeters: row.distance_to_spa_meters ?? undefined,
      distanceToBeachMeters: row.distance_to_beach_meters ?? undefined,
      status,
      notes: row.notes ?? undefined,
    };
  });

  const occupancy: OccupancyRecord[] = [];
  for (const row of occupancyResult.data as unknown as PublicAvailabilityOccupancyRow[]) {
    const range = parsePublicAvailabilityPeriod(row.period);
    if (!range) throw new PublicAvailabilityReadError();

    if (row.period_type === "hold") {
      if (!row.availability_hold_id) throw new PublicAvailabilityReadError();
      const activeHold = activeHoldById.get(row.availability_hold_id);
      if (!activeHold) continue;
      occupancy.push({
        id: row.id,
        roomId: row.room_unit_id,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        status: "pre_hold",
        expiresAt: activeHold.expires_at,
        source: "supabase",
      });
      continue;
    }

    occupancy.push({
      id: row.id,
      roomId: row.room_unit_id,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      status:
        row.period_type === "booking"
          ? "confirmed"
          : row.period_type,
      source: "supabase",
    });
  }

  return { rooms, occupancy };
}
