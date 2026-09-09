import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("./20260909050000_enforce_ready_for_manual_booking_and_move.sql", import.meta.url),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

function blockBetween(startNeedle, endNeedle) {
  const start = normalized.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? normalized.indexOf(endNeedle, start + startNeedle.length) : normalized.length;
  assert.ok(end > start, `invalid block boundary for ${startNeedle}`);
  return normalized.slice(start, end);
}

test("manual booking requires strict ready state before any booking/customer write", () => {
  const block = blockBetween(
    "create or replace function public.fn_create_manual_booking",
    "create or replace function public.fn_move_booking_room",
  );
  assert.match(block, /v_room\.sellable_status <> 'active'/);
  assert.match(block, /v_room\.operational_status <> 'ready'/);
  assert.match(block, /raise exception 'room_not_ready'/);
  assert.ok(
    block.indexOf("v_room.operational_status <> 'ready'") < block.indexOf("insert into public.customers"),
    "ready gate must execute before customer/booking writes",
  );
  assert.doesNotMatch(
    block,
    /v_room\.operational_status in \('maintenance_required', 'maintenance_in_progress', 'blocked'\)/,
  );
});

test("chessboard move requires strict ready target before moving booking_rooms", () => {
  const block = blockBetween("create or replace function public.fn_move_booking_room", null);
  assert.match(block, /v_target\.sellable_status <> 'active'/);
  assert.match(block, /v_target\.operational_status <> 'ready'/);
  assert.match(block, /raise exception 'room_not_ready'/);
  assert.ok(
    block.indexOf("v_target.operational_status <> 'ready'") < block.indexOf("update public.booking_rooms"),
    "ready gate must execute before booking room movement",
  );
  assert.doesNotMatch(
    block,
    /v_target\.operational_status in \('maintenance_required', 'maintenance_in_progress', 'blocked'\)/,
  );
});

test("patched RPCs preserve hardened execution model and ACLs", () => {
  assert.equal((normalized.match(/security definer/g) ?? []).length, 2);
  assert.equal((normalized.match(/set search_path = public, pg_temp/g) ?? []).length, 2);
  assert.equal((normalized.match(/room_not_ready/g) ?? []).length, 2);

  for (const fn of ["fn_create_manual_booking", "fn_move_booking_room"]) {
    assert.match(normalized, new RegExp(`revoke execute on function public\\.${fn}[\\s\\S]*from anon`));
    assert.match(normalized, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to authenticated`));
    assert.match(normalized, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to service_role`));
  }
});
