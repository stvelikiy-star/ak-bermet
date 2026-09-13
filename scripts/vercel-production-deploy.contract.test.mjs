import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workflow = readFileSync(
  resolve(root, ".github/workflows/deploy-vercel-production.yml"),
  "utf8",
);
const publicConfig = readFileSync(
  resolve(root, "src/lib/supabase/public-config.ts"),
  "utf8",
);

const expectedUrl = "https://ednqgzgjhnalsiiuekmw.supabase.co";
const expectedPublishableKey = "sb_publishable_7cDXEzFLEL41Rr9FCEqQUQ_b_5mBOQK";

test("Vercel deploy requires only the Vercel credential", () => {
  assert.match(workflow, /VERCEL_TOKEN:\s*\$\{\{\s*secrets\.VERCEL_TOKEN\s*\}\}/);
  assert.doesNotMatch(workflow, /secrets\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("Vercel deploy uses only the approved public Supabase configuration", () => {
  assert.ok(workflow.includes(`NEXT_PUBLIC_SUPABASE_URL: ${expectedUrl}`));
  assert.ok(workflow.includes(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${expectedPublishableKey}`));
  assert.ok(publicConfig.includes(`FALLBACK_SUPABASE_URL = "${expectedUrl}"`));
  assert.ok(publicConfig.includes(`"${expectedPublishableKey}"`));
  assert.match(workflow, /type:\"plain\"/);
  assert.doesNotMatch(workflow, /type:\"sensitive\"/);
});

test("production deployment keeps Node 22 and authoritative availability smoke", () => {
  assert.match(workflow, /node-version:\s*22/);
  assert.match(workflow, /\{\"nodeVersion\":\"22\.x\"\}/);
  assert.match(workflow, /api\/availability\?checkIn=/);
  assert.match(workflow, /availability_status/);
  assert.match(workflow, /PRODUCTION_SMOKE_PASS/);
});
