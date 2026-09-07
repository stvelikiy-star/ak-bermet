import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listRoute = readFileSync(new URL("../api/manager/leads/route.ts", import.meta.url), "utf8");
const patchRoute = readFileSync(new URL("../api/manager/leads/[id]/route.ts", import.meta.url), "utf8");
const helper = readFileSync(new URL("../../lib/manager-leads-supabase.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("./leads/page.tsx", import.meta.url), "utf8");

test("manager leads read from Supabase and never from Google Sheets", () => {
  assert.match(listRoute, /loadManagerLeads/);
  assert.match(listRoute, /source:\s*"supabase"/);
  assert.doesNotMatch(listRoute, /google-sheets|getLeadsFromSheet|isGoogleSheetsEnabled/i);
  assert.match(helper, /\.from\("leads"\)/);
  assert.match(helper, /\.is\("deleted_at", null\)/);
});

test("manager lead writes are narrow, optimistic and mirrored by DB triggers", () => {
  assert.match(patchRoute, /updateManagerLead/);
  assert.match(patchRoute, /managerUserId:\s*staff\.userId/);
  assert.doesNotMatch(patchRoute, /updateLeadStatusInSheet|google-sheets/i);
  assert.match(helper, /status:\s*input\.status/);
  assert.match(helper, /manager_comment:\s*input\.managerComment/);
  assert.match(helper, /assigned_manager_id:\s*input\.managerUserId/);
  assert.match(helper, /\.eq\("updated_at", input\.expectedUpdatedAt\)/);
  assert.doesNotMatch(helper, /booking_id:\s*input|source:\s*input|phone:\s*input|name:\s*input/);
});

test("manager lead routes do not log raw provider/database errors", () => {
  assert.doesNotMatch(listRoute, /console\.error\([^\n]*,\s*error/);
  assert.doesNotMatch(patchRoute, /console\.error\([^\n]*,\s*error/);
});

test("manager leads UI identifies Supabase as CRM authority and Sheets as mirror", () => {
  assert.match(page, /CRM-базе Supabase/);
  assert.match(page, /Google Sheets получает/);
  assert.match(page, /отчётное зеркало/);
});
