import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/lead";
import { getSupabasePublicClient } from "@/lib/supabase/public-client";

export interface PersistedPublicLead {
  id: string;
  leadNumber: string;
}

export class PublicLeadPersistenceError extends Error {
  constructor() {
    super("Public lead persistence failed");
    this.name = "PublicLeadPersistenceError";
  }
}

export async function persistPublicLead(
  lead: Lead,
  client: SupabaseClient = getSupabasePublicClient(),
): Promise<PersistedPublicLead> {
  // The RPC owns the allowlist, forces status=new, resolves room categories
  // server-side and cannot set staff ownership/customer/booking/audit fields.
  const { data, error } = await client.rpc("fn_public_create_lead", {
    p_source: lead.source,
    p_interest: lead.interest,
    p_name: lead.name,
    p_phone: lead.phone,
    p_check_in: lead.checkIn ?? null,
    p_check_out: lead.checkOut ?? null,
    p_adults: lead.adults ?? null,
    p_children: lead.children ?? null,
    p_children_ages: lead.childrenAges ?? null,
    p_room_category_name: lead.roomCategory ?? null,
    p_wants_double_bed: lead.wantsDoubleBed ?? null,
    p_needs_extra_bed: lead.needsExtraBed ?? null,
    p_needs_wifi: lead.needsWifi ?? null,
    p_needs_lower_floor: lead.needsLowerFloor ?? null,
    p_event_type: lead.eventType ?? null,
    p_guests_count: lead.guestsCount ?? null,
    p_hall_size: lead.hallSize ?? null,
    p_spa_service: lead.spaService ?? null,
    p_message: lead.message?.trim() || null,
    p_preferred_contact: lead.preferredContact ?? null,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (
    error ||
    !row ||
    typeof row.lead_id !== "string" ||
    typeof row.lead_number !== "string"
  ) {
    throw new PublicLeadPersistenceError();
  }

  return { id: row.lead_id, leadNumber: row.lead_number };
}
