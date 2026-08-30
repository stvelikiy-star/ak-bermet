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
  assert.match(workflow, /supabase db reset --local --no-seed/);
  assert.doesNotMatch(workflow, /--linked|db push|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|project[_-]?ref|supabase\.co|secrets\./i);
});

test("restore drill creates a real dump and restores it into a second local database", () => {
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /createdb -U postgres akbermet_restore_drill/);
  assert.match(workflow, /pg_restore/);
  assert.match(workflow, /restore_drill_marker/);
  assert.match(workflow, /AK_BERMET_RESTORE_DRILL_2026/);
  assert.match(workflow, /dropdb -U postgres akbermet_restore_drill/);
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
