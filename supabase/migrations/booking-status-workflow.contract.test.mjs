import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(resolve(path), "utf8");
const migration = read("supabase/migrations/20260913063233_booking_status_workflow_hardening.sql");
const api = read("src/app/api/manager/bookings/route.ts");
const actions = read("src/components/manager/BookingStatusActions.tsx");
const page = read("src/app/manager/bookings/page.tsx");

test("confirmation is database-gated by the required prepayment", () => {
  assert.match(migration, /status = 'confirmed'[\s\S]*deleted_at is null/i);
  assert.match(migration, /v_paid < v_prepayment_required/);
  assert.match(migration, /raise exception 'prepayment_required'/);
});

test("check-in is gated by arrival date and a ready sellable room", () => {
  assert.match(migration, /time zone 'Asia\/Bishkek'\)::date < v_check_in/i);
  assert.match(migration, /raise exception 'check_in_too_early'/);
  assert.match(migration, /ru\.sellable_status <> 'active'/);
  assert.match(migration, /ru\.operational_status <> 'ready'/);
  assert.match(migration, /raise exception 'room_not_ready_for_check_in'/);
});

test("cancel and no-show release room occupancy through booking_rooms lifecycle", () => {
  assert.match(migration, /create or replace function public\.fn_terminate_booking/i);
  assert.match(migration, /'cancelled'::public\.booking_status, 'no_show'::public\.booking_status/i);
  assert.match(migration, /cancellation_reason_required/);
  assert.match(migration, /no_show_too_early/);
  assert.match(migration, /update public\.booking_rooms[\s\S]*set status = 'cancelled'[\s\S]*status = 'active'/i);
});

test("manager API exposes only guarded status targets and delegates to RPCs", () => {
  assert.match(api, /STATUS_TARGETS = new Set\(\["confirmed", "checked_in", "checked_out", "cancelled", "no_show"\]\)/);
  assert.match(api, /export async function PATCH/);
  assert.match(api, /fn_terminate_booking/);
  assert.match(api, /fn_advance_booking_status/);
  assert.match(api, /PREPAYMENT_REQUIRED/);
  assert.match(api, /ROOM_NOT_READY_FOR_CHECK_IN/);
  assert.match(api, /CANCELLATION_REASON_REQUIRED/);
});

test("CRM exposes receptionist lifecycle controls", () => {
  assert.match(actions, /Подтвердить/);
  assert.match(actions, /Заселить/);
  assert.match(actions, /Выселить/);
  assert.match(actions, /Отменить/);
  assert.match(actions, /No-show/);
  assert.match(actions, /method: "PATCH"/);
  assert.match(page, /<BookingStatusActions/);
  assert.match(page, /предоплаты не меньше 20%/);
});
