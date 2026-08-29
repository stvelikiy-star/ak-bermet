import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("./20260829102000_super_chessboard_v2.sql", import.meta.url),
  "utf8",
);
const placementRoute = fs.readFileSync(
  new URL("../../src/app/api/manager/bookings/placement/route.ts", import.meta.url),
  "utf8",
);
const serviceRoute = fs.readFileSync(
  new URL("../../src/app/api/manager/bookings/services/route.ts", import.meta.url),
  "utf8",
);
const board = fs.readFileSync(
  new URL("../../src/components/manager/SuperChessboard.tsx", import.meta.url),
  "utf8",
);

const sql = migration.replace(/\s+/g, " ").toLowerCase();

test("room move is role-gated, audited and delegates collision authority to occupancy constraint", () => {
  assert.match(sql, /create or replace function public\.fn_move_booking_room/);
  for (const role of ["owner", "administrator", "manager"]) {
    assert.match(sql, new RegExp(`public\\.has_role\\('${role}'\\)`));
  }
  assert.match(sql, /update public\.booking_rooms set room_unit_id = p_target_room_unit_id/);
  assert.match(sql, /insert into public\.booking_room_change_history/);
  assert.doesNotMatch(sql, /insert into public\.occupancy_periods/);
  assert.match(sql, /revoke all on function public\.fn_move_booking_room[\s\S]*from public/);
  assert.match(sql, /grant execute on function public\.fn_move_booking_room[\s\S]*to authenticated/);
});

test("room move rejects unsafe room state, capacity and post-checkin mutation", () => {
  assert.match(sql, /v_booking\.status not in \('pending_confirmation', 'confirmed'\)/);
  assert.match(sql, /sellable_status <> 'active'/);
  assert.match(sql, /maintenance_required/);
  assert.match(sql, /maintenance_in_progress/);
  assert.match(sql, /room_capacity_exceeded/);
  assert.match(sql, /extra_bed_capacity_exceeded/);
});

test("universal service catalog keeps unknown-price services manual and approved prices fixed", () => {
  for (const code of ["TRANSFER", "SPA", "POOL", "HOT_SPRINGS", "OTHER"]) {
    assert.match(migration, new RegExp(`\\('${code}',[^\\n]+?'manual', null`, "i"));
  }
  for (const [code, price] of [
    ["CHILD_MEAL", "1440"],
    ["CHILD_EXTRA_BED", "1500"],
    ["ADULT_MEAL", "1800"],
    ["ADULT_EXTRA_BED", "1800"],
    ["PARKING_SUMMER", "150"],
    ["PARKING_OTHER", "100"],
  ]) {
    assert.match(migration, new RegExp(`\\('${code}',[^\\n]+?'fixed', ${price}`, "i"));
  }
  assert.match(sql, /manual_service_price_required/);
  assert.match(sql, /create table if not exists public\.booking_services/);
});

test("placement API validates preview/commit modes, previews authoritative occupancy and commits through RPC", () => {
  assert.match(placementRoute, /type PlacementMode = "preview" \| "commit"/);
  assert.match(placementRoute, /input\.mode === "preview" \|\| input\.mode === "commit"/);
  assert.match(placementRoute, /if \(payload\.mode === "commit"\)/);
  assert.match(placementRoute, /\.from\("occupancy_periods"\)/);
  assert.match(placementRoute, /\.overlaps\("period"/);
  assert.match(placementRoute, /supabase\.rpc\("fn_move_booking_room"/);
  assert.match(placementRoute, /error\.code === "23P01"/);
});

test("services API writes only through guarded RPCs", () => {
  assert.match(serviceRoute, /supabase\.rpc\("fn_add_booking_service"/);
  assert.match(serviceRoute, /supabase\.rpc\("fn_set_booking_service_status"/);
  assert.doesNotMatch(serviceRoute, /\.from\("booking_services"\)\.insert/);
});

test("manager board exposes direct booking, guest card, services and guarded drag-drop", () => {
  assert.match(board, /ManualBookingForm/);
  assert.match(board, /draggable=\{isMovable\(period\)\}/);
  assert.match(board, /onDrop=\{\(event\) => onDrop\(event, room, date\)\}/);
  assert.match(board, /Дополнительные услуги/);
  assert.match(board, /Переместить \/ изменить даты/);
  assert.match(board, /1\. Проверить/);
  assert.match(board, /2\. Подтвердить перенос/);
});
