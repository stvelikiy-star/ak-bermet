import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/lead";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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

function preserveUnresolvedRoomCategory(lead: Lead): string | null {
  const message = lead.message?.trim() ?? "";
  if (!lead.roomCategory) return message || null;

  const categoryNote = `Категория номера: ${lead.roomCategory}`;
  return message ? `${categoryNote}\n${message}` : categoryNote;
}

async function resolveRoomCategoryId(
  client: SupabaseClient,
  lead: Lead,
): Promise<{ roomCategoryId: string | null; message: string | null }> {
  if (!lead.roomCategory) {
    return { roomCategoryId: null, message: lead.message?.trim() || null };
  }

  const { data, error } = await client
    .from("room_categories")
    .select("id")
    .eq("name", lead.roomCategory)
    .is("deleted_at", null)
    .limit(2);

  if (!error && data?.length === 1 && typeof data[0]?.id === "string") {
    return {
      roomCategoryId: data[0].id,
      message: lead.message?.trim() || null,
    };
  }

  // A lead must never be lost only because category reference data drifted.
  // Preserve the user's exact choice in the free-text field for the manager.
  return {
    roomCategoryId: null,
    message: preserveUnresolvedRoomCategory(lead),
  };
}

export async function persistPublicLead(
  lead: Lead,
  client: SupabaseClient = getSupabaseAdminClient(),
): Promise<PersistedPublicLead> {
  const { roomCategoryId, message } = await resolveRoomCategoryId(client, lead);

  // Explicit allowlist: public input cannot set staff ownership, booking links,
  // customer identity, audit fields, or database-generated identifiers.
  const payload = {
    source: lead.source,
    interest: lead.interest,
    status: lead.status,
    name: lead.name,
    phone: lead.phone,
    check_in: lead.checkIn ?? null,
    check_out: lead.checkOut ?? null,
    adults: lead.adults ?? null,
    children: lead.children ?? null,
    children_ages: lead.childrenAges ?? null,
    room_category_id: roomCategoryId,
    wants_double_bed: lead.wantsDoubleBed ?? null,
    needs_extra_bed: lead.needsExtraBed ?? null,
    needs_wifi: lead.needsWifi ?? null,
    needs_lower_floor: lead.needsLowerFloor ?? null,
    event_type: lead.eventType ?? null,
    guests_count: lead.guestsCount ?? null,
    hall_size: lead.hallSize ?? null,
    spa_service: lead.spaService ?? null,
    message,
    preferred_contact: lead.preferredContact ?? null,
  };

  const { data, error } = await client
    .from("leads")
    .insert(payload)
    .select("id, lead_number")
    .single();

  if (
    error ||
    !data ||
    typeof data.id !== "string" ||
    typeof data.lead_number !== "string"
  ) {
    throw new PublicLeadPersistenceError();
  }

  return { id: data.id, leadNumber: data.lead_number };
}
