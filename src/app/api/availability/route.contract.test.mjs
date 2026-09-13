import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../../../../supabase/migrations/20260913073000_remove_web_service_role_dependency.sql", import.meta.url),
  "utf8"
).toLowerCase();
const types = fs.readFileSync(
  new URL("../../../types/availability.ts", import.meta.url),
  "utf8"
);

test("public availability uses Supabase RPC authority, never Google Sheets or service role", () => {
  assert.doesNotMatch(route, /@\/lib\/google-sheets/);
  assert.doesNotMatch(route, /getRoomsFromSheet|getOccupancyFromSheet|isGoogleSheetsEnabled/);
  assert.match(route, /getSupabasePublicClient/);
  assert.match(route, /fn_public_availability/);
  assert.match(route, /source: "supabase"/);
  assert.doesNotMatch(route, /loadAuthoritativeAvailability|getSupabaseAdminClient/);
});

test("mock availability requires explicit local selection", () => {
  assert.match(route, /NODE_ENV === "development"/);
  assert.match(route, /NODE_ENV === "test"/);
  assert.match(route, /AVAILABILITY_SOURCE === "mock"/);
});

test("public availability RPC exposes only active ready rooms", () => {
  assert.match(migration, /ru\.sellable_status = 'active'/);
  assert.match(migration, /ru\.operational_status = 'ready'/);
  assert.match(migration, /from public\.room_units/);
  assert.match(migration, /public\.occupancy_periods/);
});

test("expired holds do not block public availability", () => {
  assert.match(migration, /op\.period_type <> 'hold'/);
  assert.match(migration, /ah\.status = 'active'/);
  assert.match(migration, /ah\.expires_at > now\(\)/);
  assert.match(migration, /op\.period && daterange/);
});

test("technical and stop-sale occupancy remain blocking", () => {
  assert.match(types, /\| "maintenance_block"/);
  assert.match(types, /\| "stop_sale"/);
  assert.match(types, /"maintenance_block",/);
  assert.match(types, /"stop_sale",/);
});

test("authoritative RPC failure fails closed with sanitized 503", () => {
  assert.match(route, /Public Supabase RPC failed/);
  assert.match(route, /"availability_unknown"/);
  assert.match(route, /case "availability_unknown":\s*return 503/);
  assert.match(route, /error\?\.code/);
  assert.doesNotMatch(route, /console\.error\([^)]*JSON\.stringify/);
});

test("atomic production hold RPC uses real staff JWT and role gate", () => {
  assert.match(route, /createAvailabilityHoldRpc/);
  assert.match(route, /createSupabaseServerClient/);
  assert.match(route, /HOLD_CREATOR_ROLES/);
  assert.match(route, /owner/);
  assert.match(route, /administrator/);
  assert.match(route, /manager/);
  assert.match(route, /createAvailabilityHoldRpc\([\s\S]*serverClient/);
});

test("public availability RPC ACL is explicit", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /grant execute on function public\.fn_public_availability\(date, date, integer, text\) to anon, authenticated;/,
  );
});
