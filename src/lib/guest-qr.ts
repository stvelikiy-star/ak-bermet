import { createHash, randomBytes } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const GUEST_REQUEST_TYPES = ["housekeeping", "towels", "water", "maintenance", "restaurant", "other"] as const;
export type GuestRequestType = (typeof GUEST_REQUEST_TYPES)[number];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function createGuestToken(): string {
  return randomBytes(24).toString("base64url");
}
export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
export function isGuestRequestType(value: unknown): value is GuestRequestType {
  return typeof value === "string" && (GUEST_REQUEST_TYPES as readonly string[]).includes(value);
}
export interface GuestRoomAccess { id: string; roomUnitId: string; roomNumber: string; buildingName: string; categoryName: string; expiresAt: string; label: string; }
function relationFirst<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
export async function findGuestRoomByToken(token: string): Promise<GuestRoomAccess | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const { data, error } = await getSupabaseAdminClient()
    .from("guest_room_access_tokens")
    .select("id, room_unit_id, expires_at, label, room_units ( room_number, buildings ( name ), room_categories ( name ) )")
    .eq("token_hash", hashGuestToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  const room = relationFirst(data.room_units as { room_number?: string; buildings?: unknown; room_categories?: unknown } | { room_number?: string; buildings?: unknown; room_categories?: unknown }[] | null);
  const building = relationFirst(room?.buildings as { name?: string } | { name?: string }[] | null);
  const category = relationFirst(room?.room_categories as { name?: string } | { name?: string }[] | null);
  return { id: data.id, roomUnitId: data.room_unit_id, roomNumber: room?.room_number ?? "—", buildingName: building?.name ?? "AK BERMET", categoryName: category?.name ?? "Номер", expiresAt: data.expires_at, label: data.label };
}
export function guestPortalUrl(origin: string, token: string): string {
  return new URL("/guest/" + token, origin).toString();
}
export function isUuidValue(value: string): boolean { return isUuid(value); }
