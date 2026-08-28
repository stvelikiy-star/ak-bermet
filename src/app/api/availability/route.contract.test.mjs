import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const supabase = fs.readFileSync(
  new URL("../../../lib/supabase-admin.ts", import.meta.url),
  "utf8"
);
const types = fs.readFileSync(
  new URL("../../../types/availability.ts", import.meta.url),
  "utf8"
);

test("public availability route no longer uses Google Sheets authority", () => {
  assert.doesNotMatch(route, /@\/lib\/google-sheets/);
  assert.doesNotMatch(route, /getRoomsFromSheet|getOccupancyFromSheet|isGoogleSheetsEnabled/);
  assert.match(route, /loadAuthoritativeAvailability/);
  assert.match(route, /source: "supabase"/);
});

test("mock availability requires explicit local selection", () => {
  assert.match(route, /NODE_ENV === "development"/);
  assert.match(route, /NODE_ENV === "test"/);
  assert.match(route, /AVAILABILITY_SOURCE === "mock"/);
});

test("authoritative reader uses Supabase room_units and occupancy_periods", () => {
  assert.match(supabase, /\.from\("room_units"\)/);
  assert.match(supabase, /\.from\("occupancy_periods"\)/);
  assert.match(supabase, /\.eq\("status", "active"\)/);
});

test("hold occupancy is accepted only through active nonexpired durable holds", () => {
  assert.match(supabase, /listActiveAvailabilityHolds/);
  assert.match(supabase, /activeHoldById/);
  assert.match(supabase, /if \(!activeHold\) continue/);
});

test("technical and stop-sale occupancy remain blocking", () => {
  assert.match(types, /\| "maintenance_block"/);
  assert.match(types, /\| "stop_sale"/);
  assert.match(types, /"maintenance_block",/);
  assert.match(types, /"stop_sale",/);
});

test("authoritative read failure fails closed with sanitized 503 path", () => {
  assert.match(route, /Authoritative Supabase read failed/);
  assert.match(route, /"availability_unknown"/);
  assert.match(route, /case "availability_unknown":\s*return 503/);
  assert.doesNotMatch(route, /console\.error\([^\n]*error/);
});

test("atomic production hold RPC and role gate are preserved", () => {
  assert.match(route, /createAvailabilityHoldRpc/);
  assert.match(route, /HOLD_CREATOR_ROLES/);
  assert.match(route, /owner/);
  assert.match(route, /administrator/);
  assert.match(route, /manager/);
  assert.match(route, /if \(source === "supabase"\)/);
});

test("authoritative room mapping keeps unsellable and nonready rooms unavailable", () => {
  assert.match(supabase, /sellable_status !== "active"/);
  assert.match(supabase, /operational_status === "ready"/);
  assert.match(supabase, /"do_not_sell"/);
  assert.match(supabase, /"maintenance"/);
});
