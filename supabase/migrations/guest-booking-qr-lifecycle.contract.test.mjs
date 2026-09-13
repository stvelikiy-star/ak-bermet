import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(resolve(path), "utf8");

const lifecycle = read("supabase/migrations/20260913055407_guest_booking_qr_lifecycle.sql");
const uniqueness = read("supabase/migrations/20260913055623_guest_booking_room_qr_uniqueness.sql");
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

test("manager QR endpoint is booking-aware and fail-closed", () => {
  assert.match(managerRoute, /GUEST_ACTIVE_BOOKING_STATUSES = new Set\(\["confirmed", "checked_in"\]\)/);
  assert.match(managerRoute, /BOOKING_NOT_GUEST_ACTIVE/);
  assert.match(managerRoute, /BOOKING_EXPIRED/);
  assert.match(managerRoute, /BOOKING_ROOM_MISMATCH/);
  assert.match(managerRoute, /\.eq\("booking_id", bookingId\)[\s\S]*\.eq\("room_unit_id", roomUnitId\)/);
  assert.match(managerRoute, /booking_id: bookingId/);
  assert.match(managerRoute, /expires_at: expiresAt\.toISOString\(\)/);
});

test("guest token lookup requires an active booking and guest requests preserve booking identity", () => {
  assert.match(guestLookup, /if \(error \|\| !data \|\| !data\.booking_id\) return null/);
  assert.match(guestLookup, /\.in\("status", \["confirmed", "checked_in"\]\)/);
  assert.match(guestLookup, /bookingId: data\.booking_id/);
  assert.match(guestRequests, /booking_id: guest\.bookingId/);
});

test("manager UI creates and indexes QR by booking-room pair", () => {
  assert.match(managerPanel, /function stayKey\(bookingId: string, roomUnitId: string\)/);
  assert.match(managerPanel, /bookingId: stay\.bookingId/);
  assert.match(managerPanel, /roomUnitId: stay\.roomUnitId/);
  assert.match(managerPanel, /activeByStay/);
});
