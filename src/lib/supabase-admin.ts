import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BookingStatus, OccupancyRecord } from "@/types/availability";

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
  idempotencyKey: string;
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
  status?: unknown;
}

export type RoomUnitMappingResult =
  | {
      status: "mapped";
      externalRoomId: string;
      roomUnitId: string;
    }
  | { status: "missing" | "duplicated" | "ambiguous" | "invalid" };

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

function hasInvalidExplicitRoomUnitId(
  room: RoomIdentityMappingEvidence
): boolean {
  return [room.roomUnitId, room.room_unit_id].some(
    (value) =>
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim().length === 0) &&
      normalizeUuid(value) === null
  );
}

function explicitRoomUnitId(room: RoomIdentityMappingEvidence): string | null {
  const ids = explicitRoomUnitIds(room);
  return ids.length === 1 ? ids[0] : null;
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
  if (matches.length === 0) return { status: "missing" };
  if (matches.length !== 1) {
    const matchedIds = new Set(
      matches.flatMap((room) => explicitRoomUnitIds(room))
    );
    return { status: matchedIds.size > 1 ? "ambiguous" : "duplicated" };
  }

  const matchedRoom = matches[0];
  if (hasInvalidExplicitRoomUnitId(matchedRoom)) {
    return { status: "invalid" };
  }
  const roomUnitIds = explicitRoomUnitIds(matchedRoom);
  if (roomUnitIds.length === 0) return { status: "missing" };
  if (roomUnitIds.length !== 1) return { status: "ambiguous" };

  const externalRoomId = matchedRoom.id.trim();
  if (!externalRoomId) return { status: "missing" };

  // The reverse side must also be one-to-one. Two external inventory rows
  // claiming the same UUID are duplicated mappings even when the requested
  // external id itself occurs only once.
  const uuidOwners = rooms.filter(
    (room) => explicitRoomUnitId(room) === roomUnitIds[0]
  );
  if (uuidOwners.length !== 1) return { status: "duplicated" };

  return {
    status: "mapped",
    externalRoomId,
    roomUnitId: roomUnitIds[0],
  };
}

export class OwnerActionRequiredError extends Error {
  readonly code = "OWNER_ACTION_REQUIRED" as const;
  readonly reason: "missing" | "duplicated" | "ambiguous" | "invalid";

  constructor(reason: "missing" | "duplicated" | "ambiguous" | "invalid") {
    super("Authoritative Sheets synchronization evidence is incomplete");
    this.name = "OwnerActionRequiredError";
    this.reason = reason;
  }
}

const INVENTORY_ROOM_STATUSES = new Set(["active", "maintenance", "do_not_sell"]);

/**
 * Availability is meaningful only when every inventory row has a complete,
 * one-to-one external-id/UUID mapping and a recognized operational status.
 * Rejecting the whole snapshot is deliberate: omitting only a corrupt row can
 * hide occupancy which still refers to that row and make another answer look
 * authoritative when the source snapshot is not.
 */
export function validateRoomInventoryForAvailability(
  rooms: readonly RoomIdentityMappingEvidence[]
): void {
  for (const room of rooms) {
    if (
      typeof room.id !== "string" ||
      room.id.trim().length === 0 ||
      typeof room.status !== "string" ||
      !INVENTORY_ROOM_STATUSES.has(room.status)
    ) {
      throw new OwnerActionRequiredError("invalid");
    }
    const mapping = resolveRoomUnitMapping(room.id, rooms);
    if (mapping.status !== "mapped") {
      throw new OwnerActionRequiredError(mapping.status);
    }
  }
}

function assertMappedRoomIsActive(
  mapping: Extract<RoomUnitMappingResult, { status: "mapped" }>,
  rooms: readonly RoomIdentityMappingEvidence[]
): void {
  const matches = rooms.filter(
    (room) =>
      room.id.trim() === mapping.externalRoomId &&
      explicitRoomUnitId(room) === mapping.roomUnitId
  );
  if (matches.length !== 1 || matches[0].status !== "active") {
    throw new OwnerActionRequiredError("invalid");
  }
}

export interface SheetsBookingSyncEvent {
  external_booking_id: string;
  room_unit_id: string;
  check_in: string;
  check_out: string;
  source_status: BookingStatus;
  blocks_availability: boolean;
  source_updated_at: string;
  event_fingerprint: string;
}

const BOOKING_STATUS_VALUES = new Set<BookingStatus>([
  "pre_hold",
  "waiting_prepayment",
  "paid",
  "confirmed",
  "checked_in",
  "checking_out",
  "no_show",
  "cancelled",
]);
const BLOCKING_SHEETS_BOOKING_STATUSES = new Set<BookingStatus>([
  "pre_hold",
  "waiting_prepayment",
  "paid",
  "confirmed",
  "checked_in",
  "checking_out",
]);
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isStrictDate(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function normalizedSourceTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const normalized = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i.exec(
    normalized
  );
  if (!match || !isStrictDate(match[1])) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function eventFingerprint(
  event: Omit<SheetsBookingSyncEvent, "event_fingerprint">
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        event.external_booking_id,
        event.room_unit_id,
        event.check_in,
        event.check_out,
        event.source_status,
        event.blocks_availability,
        event.source_updated_at,
      ])
    )
    .digest("hex");
}

/**
 * Turns Sheets rows into the complete, authoritative event contract accepted
 * by the database. No row is mapped by a display field. Missing stable ids,
 * versions, dates, statuses, and room mappings all stop synchronization (and
 * therefore stop the hold RPC) with OWNER_ACTION_REQUIRED.
 */
export function prepareSheetsBookingSyncEvents(
  occupancy: readonly OccupancyRecord[],
  rooms: readonly RoomIdentityMappingEvidence[]
): SheetsBookingSyncEvent[] {
  const events = new Map<string, SheetsBookingSyncEvent>();

  for (const record of occupancy) {
    const externalBookingId = record.id?.trim();
    const sourceUpdatedAt = normalizedSourceTimestamp(record.sourceUpdatedAt);
    const status = record.status as BookingStatus;
    if (
      !externalBookingId ||
      externalBookingId.length > 500 ||
      !record.roomId?.trim() ||
      !sourceUpdatedAt ||
      !isStrictDate(record.checkIn) ||
      !isStrictDate(record.checkOut) ||
      record.checkOut <= record.checkIn ||
      !BOOKING_STATUS_VALUES.has(status)
    ) {
      throw new OwnerActionRequiredError("invalid");
    }

    const mapping = resolveRoomUnitMapping(record.roomId, rooms);
    if (mapping.status !== "mapped") {
      throw new OwnerActionRequiredError(mapping.status);
    }

    const eventWithoutFingerprint = {
      external_booking_id: externalBookingId,
      room_unit_id: mapping.roomUnitId,
      check_in: record.checkIn,
      check_out: record.checkOut,
      source_status: status,
      blocks_availability: BLOCKING_SHEETS_BOOKING_STATUSES.has(status),
      source_updated_at: sourceUpdatedAt,
    };
    const event: SheetsBookingSyncEvent = {
      ...eventWithoutFingerprint,
      event_fingerprint: eventFingerprint(eventWithoutFingerprint),
    };
    const previous = events.get(externalBookingId);
    if (previous) {
      if (previous.source_updated_at === event.source_updated_at) {
        if (previous.event_fingerprint !== event.event_fingerprint) {
          throw new OwnerActionRequiredError("ambiguous");
        }
        continue;
      }

      if (
        Date.parse(previous.source_updated_at) >
        Date.parse(event.source_updated_at)
      ) {
        continue;
      }
    }
    events.set(externalBookingId, event);
  }

  return [...events.values()].sort((a, b) =>
    a.external_booking_id.localeCompare(b.external_booking_id)
  );
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

export interface SheetsBookingHoldRpcClient {
  rpc(
    name: "fn_sync_sheets_bookings_and_create_availability_hold",
    params: {
      p_events: SheetsBookingSyncEvent[];
      p_snapshot_started_at: string;
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
    case "AKB05":
      return 400;
    case "AKB06":
      return 409;
    case "AKB03":
      return 404;
    default:
      return 503;
  }
}

function normalizedIdempotencyKey(value: string | null | undefined): string {
  if (typeof value !== "string") {
    throw new AvailabilityHoldRpcError("AKB05");
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new AvailabilityHoldRpcError("AKB05");
  }
  return normalized;
}

function assertValidHoldRange(checkIn: string, checkOut: string): void {
  if (
    !isStrictDate(checkIn) ||
    !isStrictDate(checkOut) ||
    checkOut <= checkIn
  ) {
    throw new AvailabilityHoldRpcError("AKB01");
  }
}

// Единственный writable admin-RPC в этом модуле. Атомарность, overlap
// и idempotency обеспечивает существующая функция БД. heldBy должен
// быть получен вызывающим route только из проверенной server-side сессии.
export async function createAvailabilityHoldRpc(
  input: CreateAvailabilityHoldRpcInput,
  client?: AvailabilityHoldRpcClient
): Promise<AvailabilityHoldRpcRow> {
  assertValidHoldRange(input.checkIn, input.checkOut);
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
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
    p_idempotency_key: idempotencyKey,
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
  assertMappedRoomIsActive(mapping, input.rooms);

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

/**
 * Synchronizes the complete Sheets booking snapshot and creates the hold in
 * one database transaction. Preparing every event happens before `rpc`, so a
 * missing/duplicate/ambiguous identity or source version cannot accidentally
 * fall through to the hold path.
 */
export async function syncSheetsBookingsAndCreateAvailabilityHold(
  input: Omit<CreateAvailabilityHoldRpcInput, "roomUnitId"> & {
    externalRoomId: string;
    rooms: readonly RoomIdentityMappingEvidence[];
    occupancy: readonly OccupancyRecord[];
    snapshotStartedAt: string;
  },
  client?: SheetsBookingHoldRpcClient
): Promise<AvailabilityHoldRpcRow> {
  validateRoomInventoryForAvailability(input.rooms);
  const mapping = resolveRoomUnitMapping(input.externalRoomId, input.rooms);
  if (mapping.status !== "mapped") {
    throw new OwnerActionRequiredError(mapping.status);
  }
  assertMappedRoomIsActive(mapping, input.rooms);
  assertValidHoldRange(input.checkIn, input.checkOut);
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  const snapshotStartedAt = normalizedSourceTimestamp(input.snapshotStartedAt);
  if (!snapshotStartedAt) {
    throw new OwnerActionRequiredError("invalid");
  }
  const events = prepareSheetsBookingSyncEvents(input.occupancy, input.rooms);
  const rpcClient =
    client ??
    (getSupabaseAdminClient() as unknown as SheetsBookingHoldRpcClient);
  const { data, error } = await rpcClient.rpc(
    "fn_sync_sheets_bookings_and_create_availability_hold",
    {
      p_events: events,
      p_snapshot_started_at: snapshotStartedAt,
      p_room_unit_id: mapping.roomUnitId,
      p_check_in: input.checkIn,
      p_check_out: input.checkOut,
      p_held_by: input.heldBy,
      p_lead_id: input.leadId ?? null,
      p_idempotency_key: idempotencyKey,
    }
  );

  if (error?.code === "AKB04") {
    throw new OwnerActionRequiredError("ambiguous");
  }
  if (error) throw new AvailabilityHoldRpcError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AvailabilityHoldRpcError(undefined);
  return row;
}
