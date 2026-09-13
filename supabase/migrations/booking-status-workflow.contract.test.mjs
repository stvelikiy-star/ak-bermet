import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(resolve(path), "utf8");
const migration = read("supabase/migrations/20260913063233_booking_status_workflow_hardening.sql");
const timePolicy = read("supabase/migrations/20260913064214_booking_checkin_1300_policy.sql");
const terminationPolicy = read("supabase/migrations/20260913064557_booking_termination_policy_snapshot.sql");
const api = read("src/app/api/manager/bookings/route.ts");
const actions = read("src/components/manager/BookingStatusActions.tsx");
const page = read("src/app/manager/bookings/page.tsx");

test("confirmation is database-gated by the required prepayment", () => {
  assert.match(migration, /status = 'confirmed'[\s\S]*deleted_at is null/i);
  assert.match(migration, /v_paid < v_prepayment_required/);
  assert.match(migration, /raise exception 'prepayment_required'/);
});

test("check-in and no-show are blocked before 13:00 Bishkek time", () => {
  assert.match(timePolicy, /time zone 'Asia\/Bishkek'\) < \(v_check_in::timestamp \+ time '13:00'\)/i);
  assert.match(timePolicy, /raise exception 'check_in_too_early'/);
  assert.match(terminationPolicy, /time zone 'Asia\/Bishkek'\) < \(v_check_in::timestamp \+ time '13:00'\)/i);
  assert.match(terminationPolicy, /raise exception 'no_show_too_early'/);
});

test("check-in requires a ready sellable room", () => {
  assert.match(timePolicy, /ru\.sellable_status <> 'active'/);
  assert.match(timePolicy, /ru\.operational_status <> 'ready'/);
  assert.match(timePolicy, /raise exception 'room_not_ready_for_check_in'/);
});

test("cancel and no-show release room occupancy through booking_rooms lifecycle", () => {
  assert.match(terminationPolicy, /create or replace function public\.fn_terminate_booking/i);
  assert.match(terminationPolicy, /'cancelled'::public\.booking_status, 'no_show'::public\.booking_status/i);
  assert.match(terminationPolicy, /cancellation_reason_required/);
  assert.match(terminationPolicy, /no_show_too_early/);
  assert.match(terminationPolicy, /update public\.booking_rooms[\s\S]*set status = 'cancelled'[\s\S]*status = 'active'/i);
});

test("termination snapshots the seven-day refund policy without moving money", () => {
  assert.match(terminationPolicy, /termination_policy_code text/i);
  assert.match(terminationPolicy, /termination_days_before integer/i);
  assert.match(terminationPolicy, /when v_days_before >= 7 then 'refund_review_7_plus'/i);
  assert.match(terminationPolicy, /else 'non_refundable_under_7'/i);
  assert.match(terminationPolicy, /v_policy_code := 'non_refundable_no_show'/i);
  assert.match(page, /≥7 дней · возврат\/штраф — на проверку/);
  assert.match(page, /<7 дней · без возврата/);
  assert.match(page, /No-show · без возврата/);
  assert.match(page, /деньги автоматически не списывает и не возвращает/);
});

test("booking status SECURITY DEFINER functions are fixed-path and management-gated", () => {
  const advanceDefinition = /create or replace function public\.fn_advance_booking_status[\s\S]*?security definer[\s\S]*?set search_path = public, pg_temp/i;
  const terminateDefinition = /create or replace function public\.fn_terminate_booking[\s\S]*?security definer[\s\S]*?set search_path = public, pg_temp/i;
  assert.match(timePolicy, advanceDefinition);
  assert.match(terminationPolicy, terminateDefinition);
  assert.match(terminationPolicy, /public\.has_role\('owner'\)/);
  assert.match(terminationPolicy, /public\.has_role\('administrator'\)/);
  assert.match(terminationPolicy, /public\.has_role\('manager'\)/);
  assert.match(terminationPolicy, /revoke all on function public\.fn_terminate_booking\(uuid, public\.booking_status, text\)[\s\S]*from public, anon/i);
  assert.match(terminationPolicy, /grant execute on function public\.fn_terminate_booking\(uuid, public\.booking_status, text\)[\s\S]*to authenticated/i);
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
  assert.match(page, /минимум 20% предоплаты/);
});
