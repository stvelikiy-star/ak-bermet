import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { LeadInterest, LeadSource, LeadStatus } from "@/types/lead";
import type { ManagerLead } from "@/types/manager";

interface LeadDbRow {
  id: string;
  lead_number: string;
  created_at: string;
  updated_at: string;
  source: LeadSource;
  interest: LeadInterest;
  status: LeadStatus;
  name: string;
  phone: string;
  check_in: string | null;
  check_out: string | null;
  adults: number | null;
  children: number | null;
  children_ages: string | null;
  room_category_id: string | null;
  wants_double_bed: boolean | null;
  needs_extra_bed: boolean | null;
  needs_wifi: boolean | null;
  needs_lower_floor: boolean | null;
  event_type: string | null;
  guests_count: number | null;
  hall_size: string | null;
  spa_service: string | null;
  message: string | null;
  preferred_contact: "whatsapp" | "phone" | null;
  assigned_manager_id: string | null;
  manager_comment: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
}

export class ManagerLeadsReadError extends Error {
  constructor() {
    super("Manager leads read failed");
    this.name = "ManagerLeadsReadError";
  }
}

export class ManagerLeadUpdateError extends Error {
  constructor(public readonly code: "stale" | "failed") {
    super(code === "stale" ? "Manager lead is stale" : "Manager lead update failed");
    this.name = "ManagerLeadUpdateError";
  }
}

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

async function requireClient(client?: SupabaseClient): Promise<SupabaseClient> {
  if (client) return client;
  const serverClient = await createSupabaseServerClient();
  if (!serverClient) throw new ManagerLeadsReadError();
  return serverClient;
}

export async function loadManagerLeads(client?: SupabaseClient): Promise<ManagerLead[]> {
  const db = await requireClient(client);
  const { data, error } = await db
    .from("leads")
    .select(
      "id, lead_number, created_at, updated_at, source, interest, status, name, phone, check_in, check_out, adults, children, children_ages, room_category_id, wants_double_bed, needs_extra_bed, needs_wifi, needs_lower_floor, event_type, guests_count, hall_size, spa_service, message, preferred_contact, assigned_manager_id, manager_comment",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) throw new ManagerLeadsReadError();
  const rows = data as LeadDbRow[];

  const managerIds = [...new Set(rows.map((row) => row.assigned_manager_id).filter((id): id is string => Boolean(id)))];
  const categoryIds = [...new Set(rows.map((row) => row.room_category_id).filter((id): id is string => Boolean(id)))];

  const [profilesResult, categoriesResult] = await Promise.all([
    managerIds.length
      ? db.from("profiles").select("id, full_name, email").in("id", managerIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    categoryIds.length
      ? db.from("room_categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] as CategoryRow[], error: null }),
  ]);

  if (profilesResult.error || categoriesResult.error) throw new ManagerLeadsReadError();

  const managers = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((row) => [
      row.id,
      row.full_name?.trim() || row.email?.trim() || "Назначен",
    ]),
  );
  const categories = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((row) => [row.id, row.name]),
  );

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
    interest: row.interest,
    status: row.status,
    name: row.name,
    phone: row.phone,
    checkIn: optional(row.check_in),
    checkOut: optional(row.check_out),
    adults: optional(row.adults),
    children: optional(row.children),
    childrenAges: optional(row.children_ages),
    roomCategory: row.room_category_id ? categories.get(row.room_category_id) : undefined,
    wantsDoubleBed: optional(row.wants_double_bed),
    needsExtraBed: optional(row.needs_extra_bed),
    needsWifi: optional(row.needs_wifi),
    needsLowerFloor: optional(row.needs_lower_floor),
    eventType: optional(row.event_type),
    guestsCount: optional(row.guests_count),
    hallSize: optional(row.hall_size),
    spaService: optional(row.spa_service),
    message: optional(row.message),
    preferredContact: optional(row.preferred_contact),
    manager: row.assigned_manager_id ? managers.get(row.assigned_manager_id) : undefined,
    managerComment: optional(row.manager_comment),
  }));
}

export async function updateManagerLead(
  input: {
    leadId: string;
    status: LeadStatus;
    managerComment: string;
    managerUserId: string;
    expectedUpdatedAt: string;
  },
  client?: SupabaseClient,
): Promise<string> {
  const db = await requireClient(client);

  // Ownership is derived inside the database from auth.uid(); managerUserId is
  // retained in the input contract for compatibility but cannot override it.
  void input.managerUserId;
  const { data, error } = await db.rpc("fn_manager_update_lead", {
    p_lead_id: input.leadId,
    p_status: input.status,
    p_manager_comment: input.managerComment,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) throw new ManagerLeadUpdateError("failed");
  if (typeof data !== "string" || data.length === 0) {
    throw new ManagerLeadUpdateError("stale");
  }
  return data;
}
