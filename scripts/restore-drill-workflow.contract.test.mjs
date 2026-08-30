import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/disposable-restore-drill.yml", import.meta.url),
  "utf8",
);

test("restore drill is disposable and never targets a remote Supabase project", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /npx supabase start/);
  assert.ok((workflow.match(/supabase db reset --local --no-seed/g) ?? []).length >= 2);
  assert.doesNotMatch(workflow, /--linked|db push|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|project[_-]?ref|supabase\.co|secrets\./i);
});

test("restore drill rebuilds schema and restores a real application-data dump", () => {
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /--data-only/);
  assert.match(workflow, /--table=public\.customers/);
  assert.match(workflow, /pg_restore/);
  assert.match(workflow, /AK BERMET RESTORE DRILL/);
  assert.match(workflow, /AK_BERMET_RESTORE_DRILL_2026/);
  assert.doesNotMatch(workflow, /createdb|akbermet_restore_drill|realtime\.list_changes/i);
});

test("restore drill verifies migration ledger and critical PMS objects", () => {
  assert.match(workflow, /production-migrations-approved\.json/);
  assert.match(workflow, /supabase_migrations\.schema_migrations/);
  assert.match(workflow, /public\.room_units/);
  assert.match(workflow, /public\.booking_payments/);
  assert.match(workflow, /public\.site_content_public/);
  assert.match(workflow, /fn_create_availability_hold/);
  assert.match(workflow, /RESTORE_DRILL_PASS/);
});

test("restore drill contains no production deployment or DNS actions", () => {
  assert.doesNotMatch(workflow, /--prod|vercel|promote|rollback|dns|akbermet\.kg/i);
});
