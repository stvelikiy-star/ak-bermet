import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("./20260814082834_manual_booking_transaction_rpc.sql", import.meta.url),
  "utf8",
);

const normalized = migration.replace(/\s+/g, " ").toLowerCase();

test("manual booking RPC is invoker-rights and authenticated-only", () => {
  assert.match(normalized, /create or replace function public\.fn_create_manual_booking/);
  assert.match(normalized, /security invoker/);
  assert.doesNotMatch(normalized, /security definer/);
  assert.match(normalized, /set search_path = public, pg_temp/);
  assert.match(normalized, /revoke all on function public\.fn_create_manual_booking[\s\S]*from public, anon/);
  assert.match(normalized, /grant execute on function public\.fn_create_manual_booking[\s\S]*to authenticated/);
});

test("manual booking RPC enforces staff roles and authoritative room safety", () => {
  for (const role of ["owner", "administrator", "manager"]) {
    assert.match(normalized, new RegExp(`public\\.has_role\\('${role}'\\)`));
  }
  assert.match(normalized, /sellable_status <> 'active'/);
  assert.match(normalized, /maintenance_required/);
  assert.match(normalized, /maintenance_in_progress/);
  assert.match(normalized, /room_capacity_exceeded/);
  assert.match(normalized, /extra_bed_capacity_exceeded/);
});

test("manual booking RPC creates customer, booking and room in one database function", () => {
  assert.match(normalized, /insert into public\.customers/);
  assert.match(normalized, /on conflict \(phone\) do update/);
  assert.match(normalized, /insert into public\.bookings/);
  assert.match(normalized, /'pending_confirmation'/);
  assert.match(normalized, /round\(coalesce\(p_total_amount_kgs, 0\) \* 0\.20, 2\)/);
  assert.match(normalized, /insert into public\.booking_rooms/);
  assert.doesNotMatch(normalized, /insert into public\.occupancy_periods/);
});

test("manual booking RPC never targets auth.users or service role", () => {
  assert.doesNotMatch(normalized, /auth\.users/);
  assert.doesNotMatch(normalized, /service_role/);
});
