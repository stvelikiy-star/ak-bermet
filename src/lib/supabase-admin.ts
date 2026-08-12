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
