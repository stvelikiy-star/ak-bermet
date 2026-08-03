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
  hold_expires_at?: string;
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
    .from("bookings")
    .select("id, room_unit_id, check_in, check_out, status, hold_expires_at")
    .eq("status", "pre_hold")
    .gt("hold_expires_at", now.toISOString());

  if (error || !data) throw new AvailabilityHoldReadError();
  return data as AvailabilityHoldRpcRow[];
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
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AvailabilityHoldRpcError(undefined);
  return row;
}
