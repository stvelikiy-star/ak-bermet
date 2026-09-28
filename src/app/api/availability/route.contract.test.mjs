import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const bridge = fs.readFileSync(
  new URL("../../../lib/marina-smart.ts", import.meta.url),
  "utf8",
);

test("public accommodation availability uses MARINA SMART as the production authority", () => {
  assert.match(route, /fetchMarinaAvailability/);
  assert.match(route, /source: "marina-smart"/);
  assert.match(bridge, /\/api\/v1\/booking\/check-availability/);
  assert.doesNotMatch(route, /Public Supabase RPC failed/);
  assert.doesNotMatch(route, /source: "supabase"/);
});

test("MARINA SMART availability fails closed instead of falling back to a second inventory", () => {
  assert.match(route, /MARINA SMART availability failed/);
  assert.match(route, /"availability_unknown"/);
  assert.match(route, /status.*503/s);
  assert.doesNotMatch(route, /getSupabasePublicClient/);
  assert.doesNotMatch(route, /fn_public_availability/);
});

test("only sellable MARINA SMART room types are exposed to the public site", () => {
  assert.match(route, /item\.available_count > 0/);
  assert.match(route, /item\.pricing\?\.sellable === true/);
  assert.match(route, /roomTypeCode: item\.room_type_code/);
});

test("broad website categories are mapped without inventing room-type codes", () => {
  assert.match(route, /matchesPublicCategory/);
  assert.match(route, /category\.includes\("garden"\)/);
  assert.match(route, /category\.includes\("полулюкс"\)/);
  assert.match(route, /category === "люкс"/);
  assert.match(route, /category\.includes\("стандарт"\)/);
  assert.match(route, /category\.includes\("семейн"\)/);
  assert.match(route, /category\.includes\("коттедж"\)/);
});

test("mock availability remains limited to explicit local development or test", () => {
  assert.match(route, /NODE_ENV === "development"/);
  assert.match(route, /NODE_ENV === "test"/);
  assert.match(route, /AVAILABILITY_SOURCE === "mock"/);
});

test("legacy website holds are fail-closed in production", () => {
  assert.match(route, /process\.env\.NODE_ENV === "production"/);
  assert.match(route, /legacy_booking_authority_disabled/);
  assert.match(route, /Удержания и новые бронирования ведутся в MARINA SMART/);
});
