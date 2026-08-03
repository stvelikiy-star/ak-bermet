import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export interface AvailabilityHoldRpcRow {
  id: string;
  room_unit_id: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at?: string;
  expires_at?: string;
  idempotency_key?: string;
  [key: string]: unknown;
}

export class AvailabilityHoldReadError extends Error {
  constructor() {
    super("Availability holds read failed");
    this.name = "AvailabilityHoldReadError";
  }
}

// Availability GET must consult the same durable store used by the hold RPC.
// Selecting only scheduling fields avoids exposing guest or payment data from
// the service-role client used by the public availability endpoint.
export async function listActiveAvailabilityHolds(
  now: Date = new Date(),
  client: SupabaseClient = getSupabaseAdminClient()
): Promise<AvailabilityHoldRpcRow[]> {
  const { data, error } = await client
    .schema("public")
    .from("availability_holds")
    .select("id, room_unit_id, check_in, check_out, status, created_at, expires_at")
    .eq("status", "active")
    .gt("expires_at", now.toISOString());

  if (error || !data) throw new AvailabilityHoldReadError();
  return data as AvailabilityHoldRpcRow[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A Sheets room id is an external identifier and must never be treated as a
 * room_units UUID merely because it arrived in the roomId field.  The only
 * accepted evidence is an explicit UUID mapping attached to that inventory
 * row by the configured inventory adapter.
 */
export interface RoomIdentityMappingEvidence {
  id: string;
  roomUnitId?: unknown;
  room_unit_id?: unknown;
}

export type RoomUnitMappingResult =
  | {
      status: "mapped";
      externalRoomId: string;
      roomUnitId: string;
    }
  | { status: "missing" | "ambiguous" };

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function explicitRoomUnitIds(room: RoomIdentityMappingEvidence): string[] {
  return [
    ...new Set(
      [room.roomUnitId, room.room_unit_id]
        .map(normalizeUuid)
        .filter((value): value is string => value !== null)
    ),
  ];
}

function matchingInventoryRooms(
  identifier: string,
  rooms: readonly RoomIdentityMappingEvidence[]
): RoomIdentityMappingEvidence[] {
  const externalId = identifier.trim();
  const uuid = normalizeUuid(identifier);
  return rooms.filter(
    (room) =>
      room.id.trim() === externalId ||
      (uuid !== null && explicitRoomUnitIds(room).includes(uuid))
  );
}

export function resolveRoomUnitMapping(
  identifier: string,
  rooms: readonly RoomIdentityMappingEvidence[]
): RoomUnitMappingResult {
  const matches = matchingInventoryRooms(identifier, rooms);
  const roomUnitIds = [
    ...new Set(matches.flatMap((room) => explicitRoomUnitIds(room))),
  ];

  if (roomUnitIds.length === 0) return { status: "missing" };
  if (roomUnitIds.length !== 1) return { status: "ambiguous" };

  const externalRoomIds = [
    ...new Set(matches.map((room) => room.id.trim()).filter(Boolean)),
  ];
  if (externalRoomIds.length !== 1) return { status: "ambiguous" };

  return {
    status: "mapped",
    externalRoomId: externalRoomIds[0],
    roomUnitId: roomUnitIds[0],
  };
}

export class OwnerActionRequiredError extends Error {
  readonly code = "OWNER_ACTION_REQUIRED" as const;
  readonly reason: "missing" | "ambiguous";

  constructor(reason: "missing" | "ambiguous") {
    super("A unique room_units.id mapping is required");
    this.name = "OwnerActionRequiredError";
    this.reason = reason;
  }
}

export interface OccupancyRoomIdentity {
  roomId: string;
  source?: string;
}

/**
 * Converts both UUID-backed durable holds and external Sheets occupancy to the
 * external id used by filterRooms.  A durable row which cannot be mapped is a
 * fail-closed condition: silently retaining its UUID could make the held room
 * appear available.
 */
export function mapOccupancyToInventoryRoomIds<
  T extends OccupancyRoomIdentity,
>(
  occupancy: readonly T[],
  rooms: readonly RoomIdentityMappingEvidence[]
): T[] {
  return occupancy.map((entry) => {
    const mapping = resolveRoomUnitMapping(entry.roomId, rooms);
    if (mapping.status === "mapped") {
      return { ...entry, roomId: mapping.externalRoomId };
    }

    const exactExternalMatches = rooms.filter(
      (room) => room.id.trim() === entry.roomId.trim()
    );
    if (
      exactExternalMatches.length === 1 &&
      (entry.source !== "supabase" || normalizeUuid(entry.roomId) === null)
    ) {
      return { ...entry, roomId: exactExternalMatches[0].id.trim() };
    }

    if (entry.source === "supabase") {
      throw new OwnerActionRequiredError(mapping.status);
    }
    return { ...entry };
  });
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
    data: AvailabilityHoldRpcRow | AvailabilityHoldRpcRow[] | null;
    error: { code?: string; message?: string } | null;
  }>;
}

export class AvailabilityHoldRpcError extends Error {
  readonly code: string | undefined;

  constructor(code: string | undefined) {
    super("Availability hold RPC failed");
    this.name = "AvailabilityHoldRpcError";
    this.code = code;
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
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AvailabilityHoldRpcError(undefined);
  return row;
}

export async function createAvailabilityHoldForMappedRoom(
  input: Omit<CreateAvailabilityHoldRpcInput, "roomUnitId"> & {
    externalRoomId: string;
    rooms: readonly RoomIdentityMappingEvidence[];
  },
  client?: AvailabilityHoldRpcClient
): Promise<AvailabilityHoldRpcRow> {
  const mapping = resolveRoomUnitMapping(input.externalRoomId, input.rooms);
  if (mapping.status !== "mapped") {
    throw new OwnerActionRequiredError(mapping.status);
  }

  return createAvailabilityHoldRpc(
    {
      roomUnitId: mapping.roomUnitId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      heldBy: input.heldBy,
      leadId: input.leadId,
      idempotencyKey: input.idempotencyKey,
    },
    client
  );
}
