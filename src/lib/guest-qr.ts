import { createHash, randomBytes } from "node:crypto";

import { getSupabasePublicClient } from "@/lib/supabase/public-client";

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

export interface GuestRoomAccess {
  id: string;
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  roomUnitId: string;
  roomNumber: string;
  buildingName: string;
  categoryName: string;
  expiresAt: string;
  label: string;
}

type GuestRoomContextRpcRow = {
  token_id: string;
  booking_id: string;
  booking_number: string;
  guest_name: string;
  room_unit_id: string;
  room_number: string;
  building_name: string;
  category_name: string;
  expires_at: string;
  label: string;
};

export async function findGuestRoomByToken(token: string): Promise<GuestRoomAccess | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;

  const { data, error } = await getSupabasePublicClient().rpc("fn_public_guest_room_context", {
    p_token_hash: hashGuestToken(token),
  });
  if (error || !data) return null;

  const row = (Array.isArray(data) ? data[0] : data) as GuestRoomContextRpcRow | undefined;
  if (!row) return null;

  return {
    id: row.token_id,
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    guestName: row.guest_name || "Гость",
    roomUnitId: row.room_unit_id,
    roomNumber: row.room_number || "—",
    buildingName: row.building_name || "AK BERMET",
    categoryName: row.category_name || "Номер",
    expiresAt: row.expires_at,
    label: row.label,
  };
}

export function guestPortalUrl(origin: string, token: string): string {
  return new URL("/guest/" + token, origin).toString();
}

export function isUuidValue(value: string): boolean {
  return isUuid(value);
}
