import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(resolve(path), "utf8");

const lifecycle = read("supabase/migrations/20260913055407_guest_booking_qr_lifecycle.sql");
const uniqueness = read("supabase/migrations/20260913055623_guest_booking_room_qr_uniqueness.sql");
const hardening = read("supabase/migrations/20260913073000_remove_web_service_role_dependency.sql");
const managerRoute = read("src/app/api/manager/guest-qr/route.ts");
const guestLookup = read("src/lib/guest-qr.ts");
const guestRequests = read("src/app/api/guest/requests/route.ts");
const managerPanel = read("src/components/manager/ManagerQrPanel.tsx");

test("database binds guest QR and guest requests to bookings", () => {
  assert.match(lifecycle, /guest_room_access_tokens[\s\S]*add column if not exists booking_id uuid/i);
  assert.match(lifecycle, /guest_service_requests[\s\S]*add column if not exists booking_id uuid/i);
  assert.match(lifecycle, /foreign key \(booking_id\) references public\.bookings\(id\) on delete cascade/i);
  assert.match(lifecycle, /where br\.booking_id = new\.booking_id[\s\S]*br\.room_unit_id = new\.room_unit_id/i);
  assert.match(lifecycle, /BOOKING_ROOM_MISMATCH/);
});

test("one active QR is allowed per booking-room pair", () => {
  assert.match(uniqueness, /drop index if exists public\.guest_room_access_tokens_one_active_per_booking_idx/i);
  assert.match(uniqueness, /unique index if not exists guest_room_access_tokens_one_active_per_booking_room_idx/i);
  assert.match(uniqueness, /\(booking_id, room_unit_id\)/i);
  assert.match(uniqueness, /where booking_id is not null and revoked_at is null/i);
});

test("terminal booking statuses automatically revoke active QR tokens", () => {
  assert.match(lifecycle, /fn_revoke_guest_tokens_on_booking_terminal/i);
  assert.match(lifecycle, /checked_out/);
  assert.match(lifecycle, /cancelled/);
  assert.match(lifecycle, /no_show/);
  assert.match(lifecycle, /where booking_id = new\.id[\s\S]*revoked_at is null/i);
});

test("manager QR endpoint uses authenticated RPC and database-enforced booking safety", () => {
  assert.match(managerRoute, /createSupabaseServerClient/);
  assert.match(managerRoute, /fn_manager_rotate_guest_room_access_token/);
  assert.match(managerRoute, /p_booking_id:\s*bookingId/);
  assert.match(managerRoute, /p_room_unit_id:\s*roomUnitId/);
  assert.match(managerRoute, /BOOKING_NOT_GUEST_ACTIVE/);
  assert.match(managerRoute, /BOOKING_EXPIRED/);
  assert.match(managerRoute, /BOOKING_ROOM_MISMATCH/);
  assert.doesNotMatch(managerRoute, /getSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/);

  const start = hardening.indexOf("create or replace function public.fn_manager_rotate_guest_room_access_token");
  const end = hardening.indexOf("revoke all on function public.fn_manager_rotate_guest_room_access_token", start);
  assert.ok(start >= 0 && end > start);
  const rotateRpc = hardening.slice(start, end);
  assert.match(rotateRpc, /b\.status in \('confirmed', 'checked_in'\)/);
  assert.match(rotateRpc, /where br\.booking_id = p_booking_id and br\.room_unit_id = p_room_unit_id/);
  assert.match(rotateRpc, /BOOKING_NOT_GUEST_ACTIVE/);
  assert.match(rotateRpc, /BOOKING_ROOM_MISMATCH/);
  assert.match(rotateRpc, /BOOKING_EXPIRED/);
  assert.match(rotateRpc, /time '11:00'/);
});

test("guest token lookup and guest request use public RPCs that preserve booking-room identity", () => {
  assert.match(guestLookup, /fn_public_guest_room_context/);
  assert.match(guestLookup, /p_token_hash:\s*hashGuestToken\(token\)/);
  assert.match(guestLookup, /bookingId:\s*row\.booking_id/);
  assert.doesNotMatch(guestLookup, /getSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/);

  assert.match(guestRequests, /fn_public_create_guest_request/);
  assert.match(guestRequests, /p_token_hash:\s*hashGuestToken\(token\)/);
  assert.match(guestRequests, /booking_id:\s*row\.booking_id/);
  assert.match(guestRequests, /INVALID_OR_EXPIRED_QR/);
  assert.doesNotMatch(guestRequests, /getSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/);

  const contextStart = hardening.indexOf("create or replace function public.fn_public_guest_room_context");
  const contextEnd = hardening.indexOf("revoke all on function public.fn_public_guest_room_context", contextStart);
  const requestStart = hardening.indexOf("create or replace function public.fn_public_create_guest_request");
  const requestEnd = hardening.indexOf("revoke all on function public.fn_public_create_guest_request", requestStart);
  assert.ok(contextStart >= 0 && contextEnd > contextStart);
  assert.ok(requestStart >= 0 && requestEnd > requestStart);
  const contextRpc = hardening.slice(contextStart, contextEnd);
  const requestRpc = hardening.slice(requestStart, requestEnd);
  for (const rpc of [contextRpc, requestRpc]) {
    assert.match(rpc, /b\.status in \('confirmed', 'checked_in'\)/);
    assert.match(rpc, /booking_rooms/);
    assert.match(rpc, /room_unit_id/);
  }
  assert.match(requestRpc, /insert into public\.guest_service_requests as g/);
  assert.match(requestRpc, /v_booking_id, v_room_unit_id/);
});

test("manager UI creates and indexes QR by booking-room pair", () => {
  assert.match(managerPanel, /function stayKey\(bookingId: string, roomUnitId: string\)/);
  assert.match(managerPanel, /bookingId: stay\.bookingId/);
  assert.match(managerPanel, /roomUnitId: stay\.roomUnitId/);
  assert.match(managerPanel, /activeByStay/);
});
