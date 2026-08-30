import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(new URL("../.github/workflows/sheets-mirror.yml", import.meta.url), "utf8");

test("Sheets mirror runs on schedule with single non-cancelling concurrency group", () => {
  assert.match(workflow, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(workflow, /group: ak-bermet-sheets-mirror/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("scheduled mirror stays dry-run until protected cutover approval", () => {
  assert.match(workflow, /default: "dry-run"/);
  assert.match(workflow, /MIRROR_APPROVAL: \$\{\{ secrets\.AK_BERMET_SHEETS_MIRROR_ENABLED \}\}/);
  assert.match(workflow, /if \[ "\$EVENT_NAME" = "schedule" \]; then[\s\S]*MIRROR_APPROVAL[\s\S]*mode="execute"[\s\S]*mode="dry-run"/);
  assert.match(workflow, /MIRROR_EXECUTION_NOT_APPROVED/);
  assert.match(workflow, /node scripts\/sheets-sync-worker\.mjs --execute/);
  assert.match(workflow, /node scripts\/sheets-sync-worker\.mjs --dry-run/);
});

test("pull requests can prove runtime credentials but can never execute the mirror", () => {
  assert.match(workflow, /pull_request:[\s\S]*scripts\/sheets-sync-worker\.mjs/);
  assert.match(workflow, /elif \[ "\$EVENT_NAME" = "pull_request" \]; then[\s\S]*mode="dry-run"[\s\S]*limit="25"/);
  const prBranch = workflow.match(/elif \[ "\$EVENT_NAME" = "pull_request" \]; then([\s\S]*?)else/);
  assert.ok(prBranch, "pull_request mode branch must exist");
  assert.doesNotMatch(prBranch[1], /mode="execute"/);
});

test("workflow fails closed on missing protected configuration and never echoes secret values", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "AK_BERMET_SHEETS_MIRROR_ENABLED",
  ]) {
    const expected = name + ": " + "${{ secrets." + name + " }}";
    assert.ok(workflow.includes(expected), `missing protected workflow input ${name}`);
  }
  assert.match(workflow, /MISSING_SECRET_NAME/);
  assert.match(workflow, /Secret values were not printed/);
  assert.doesNotMatch(workflow, /echo "\$\{!name/);
});
