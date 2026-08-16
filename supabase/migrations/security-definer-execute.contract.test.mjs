import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  import.meta.dirname,
  "20260813035252_security_definer_execute_lockdown.sql",
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

const roleHelperRepairPath = resolve(
  import.meta.dirname,
  "20260816165000_restore_role_helper_security_definer.sql",
);
const roleHelperRepairSql = readFileSync(roleHelperRepairPath, "utf8").toLowerCase();

const staffRpcs = [
  "public.fn_mark_notification_read(uuid)",
  "public.fn_assign_staff(public.assignment_task_type, uuid, uuid)",
  "public.fn_accept_cleaning_task(uuid)",
  "public.fn_start_cleaning_task(uuid)",
  "public.fn_complete_cleaning_task(uuid)",
  "public.fn_report_cleaning_problem(uuid, text, boolean)",
  "public.fn_accept_maintenance_request(uuid)",
  "public.fn_start_maintenance_request(uuid)",
  "public.fn_record_maintenance_work_log(uuid, public.work_log_type, text, text, numeric, text, numeric)",
  "public.fn_complete_maintenance_work(uuid)",
  "public.fn_close_maintenance_request(uuid, public.room_operational_status, text)",
  "public.fn_record_room_inspection(uuid, public.inspection_trigger_reason, public.inspection_result, uuid, uuid, text)",
  "public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid)",
];

const internalFunctions = [
  "public.fn_transition_room_status(uuid, public.room_operational_status, uuid, uuid, uuid, text)",
  "public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid)",
  "public.fn_notify_user(uuid, public.operational_notification_type, text, text, text, uuid)",
  "public.fn_checkout_creates_cleaning_task()",
  "public.fn_audit_row_change()",
  "public.fn_notify_inspection_failed()",
  "public.sync_block_occupancy()",
  "public.sync_booking_room_occupancy()",
  "public.sync_hold_occupancy()",
];

const searchPathFunctions = [
  "public.set_maintenance_request_number()",
  "public.set_lead_number()",
  "public.fn_expire_holds()",
  "public.log_lead_status_change()",
  "public.set_updated_at()",
  "public.log_cleaning_task_status_change()",
  "public.log_booking_status_change()",
  "public.set_booking_number()",
  "public.has_role(public.role_name)",
  "public.generate_public_number(text, text)",
  "public.set_cleaning_task_number()",
  "public.is_staff()",
  "public.assigned_building_ids()",
  ...staffRpcs,
  ...internalFunctions,
];

test("all staff SECURITY DEFINER RPCs explicitly deny anon and keep authenticated access", () => {
  for (const signature of staffRpcs) {
    assert.ok(
      sql.includes(`revoke all on function ${signature} from public, anon, authenticated;`),
      `missing explicit anon/authenticated revoke for ${signature}`,
    );
    assert.ok(
      sql.includes(`grant execute on function ${signature} to authenticated, service_role;`),
      `missing authenticated/service_role grant for ${signature}`,
    );
  }
});

test("internal SECURITY DEFINER helpers are not executable by anon or authenticated", () => {
  for (const signature of internalFunctions) {
    assert.ok(
      sql.includes(`revoke all on function ${signature} from public, anon, authenticated;`),
      `missing explicit public-role revoke for ${signature}`,
    );
    assert.ok(
      sql.includes(`grant execute on function ${signature} to service_role;`),
      `missing service_role-only grant for ${signature}`,
    );
    assert.ok(
      !sql.includes(`grant execute on function ${signature} to authenticated`),
      `internal function must not be granted to authenticated: ${signature}`,
    );
  }
});

test("all advisor-flagged functions use a fixed search_path", () => {
  for (const signature of searchPathFunctions) {
    assert.ok(
      sql.includes(`alter function ${signature} set search_path = public, pg_temp;`),
      `missing fixed search_path for ${signature}`,
    );
  }
});

test("btree_gist is moved out of the exposed public schema", () => {
  assert.ok(sql.includes("alter extension btree_gist set schema extensions;"));
});

test("RLS role helpers are explicitly restored to SECURITY DEFINER with fixed search_path", () => {
  for (const signature of ["public.has_role(public.role_name)", "public.is_staff()"]) {
    assert.ok(
      roleHelperRepairSql.includes(`alter function ${signature} security definer;`),
      `missing SECURITY DEFINER repair for ${signature}`,
    );
    assert.ok(
      roleHelperRepairSql.includes(`alter function ${signature} set search_path = public, pg_temp;`),
      `missing fixed search_path repair for ${signature}`,
    );
  }
  assert.ok(!roleHelperRepairSql.includes("security invoker"));
});

test("role-helper repair does not widen RLS, grants, or mutate business data", () => {
  for (const forbidden of [
    "create policy",
    "alter policy",
    "drop policy",
    "grant ",
    "revoke ",
    "insert into",
    "update public.",
    "delete from",
  ]) {
    assert.ok(!roleHelperRepairSql.includes(forbidden), `unexpected authority/data change: ${forbidden}`);
  }
});
