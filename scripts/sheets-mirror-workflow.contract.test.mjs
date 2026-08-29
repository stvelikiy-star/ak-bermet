import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(new URL("../.github/workflows/sheets-mirror.yml", import.meta.url), "utf8");

test("Sheets mirror runs on schedule with single non-cancelling concurrency group", () => {
  assert.match(workflow, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(workflow, /group: ak-bermet-sheets-mirror/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("scheduled run executes one-way worker and manual dispatch defaults to dry-run", () => {
  assert.match(workflow, /default: "dry-run"/);
  assert.match(workflow, /if \[ "\$EVENT_NAME" = "schedule" \]; then[\s\S]*mode="execute"/);
  assert.match(workflow, /node scripts\/sheets-sync-worker\.mjs --execute/);
  assert.match(workflow, /node scripts\/sheets-sync-worker\.mjs --dry-run/);
});

test("workflow fails closed on missing protected configuration and never echoes secret values", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ]) {
    assert.match(workflow, new RegExp(`${name}: \\${\\{ secrets\\.${name} \\}\\}`));
  }
  assert.match(workflow, /MISSING_SECRET_NAME/);
  assert.match(workflow, /Secret values were not printed/);
  assert.doesNotMatch(workflow, /echo "\$\{!name/);
});
