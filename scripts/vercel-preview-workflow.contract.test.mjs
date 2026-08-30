import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(new URL("../.github/workflows/vercel-preview-proof.yml", import.meta.url), "utf8");

test("Vercel runtime proof is PR-only and pinned to the known AK BERMET preview project", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /VERCEL_ORG_ID: team_7GagNlblg6wDAIOoF44H7dFN/);
  assert.match(workflow, /VERCEL_PROJECT_ID: prj_b3kaGYbW8gVtJg4o5PlP6K4kxaIV/);
  assert.match(workflow, /VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
});

test("Vercel runtime proof fails closed when the token is absent", () => {
  assert.match(workflow, /MISSING_SECRET_NAME: VERCEL_TOKEN/);
  assert.match(workflow, /Secret values were not printed/);
  assert.match(workflow, /exit 2/);
});

test("Vercel runtime proof is preview-only and uses a pinned CLI", () => {
  assert.match(workflow, /vercel@59\.10\.0 pull --yes --environment=preview/);
  assert.match(workflow, /vercel@59\.10\.0 build/);
  assert.match(workflow, /vercel@59\.10\.0 deploy --prebuilt --yes/);
  assert.doesNotMatch(workflow, /--prod\b/);
  assert.doesNotMatch(workflow, /\bpromote\b/);
  assert.doesNotMatch(workflow, /\brollback\b/);
});
