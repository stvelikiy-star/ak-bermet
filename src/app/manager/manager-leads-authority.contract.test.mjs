import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listRoute = readFileSync(new URL("../api/manager/leads/route.ts", import.meta.url), "utf8");
const patchRoute = readFileSync(new URL("../api/manager/leads/[id]/route.ts", import.meta.url), "utf8");
const helper = readFileSync(new URL("../../lib/manager-leads-supabase.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("./leads/page.tsx", import.meta.url), "utf8");
const hardening = readFileSync(
  new URL("../../../supabase/migrations/20260913073000_remove_web_service_role_dependency.sql", import.meta.url),
  "utf8",
);

const updateRpcStart = hardening.indexOf("create or replace function public.fn_manager_update_lead");
const updateRpcEnd = hardening.indexOf("revoke all on function public.fn_manager_update_lead", updateRpcStart);
assert.ok(updateRpcStart >= 0 && updateRpcEnd > updateRpcStart);
const updateRpc = hardening.slice(updateRpcStart, updateRpcEnd);

test("manager leads read from Supabase and never from Google Sheets", () => {
  assert.match(listRoute, /loadManagerLeads/);
  assert.match(listRoute, /source:\s*"supabase"/);
  assert.doesNotMatch(listRoute, /google-sheets|getLeadsFromSheet|isGoogleSheetsEnabled/i);
  assert.match(helper, /createSupabaseServerClient/);
  assert.match(helper, /\.from\("leads"\)/);
  assert.match(helper, /\.is\("deleted_at", null\)/);
  assert.doesNotMatch(helper, /getSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
});

test("manager lead writes are narrow, optimistic and identity-bound inside the database", () => {
  assert.match(patchRoute, /updateManagerLead/);
  assert.match(patchRoute, /managerUserId:\s*staff\.userId/);
  assert.doesNotMatch(patchRoute, /updateLeadStatusInSheet|google-sheets/i);

  assert.match(helper, /\.rpc\("fn_manager_update_lead"/);
  assert.match(helper, /p_lead_id:\s*input\.leadId/);
  assert.match(helper, /p_status:\s*input\.status/);
  assert.match(helper, /p_manager_comment:\s*input\.managerComment/);
  assert.match(helper, /p_expected_updated_at:\s*input\.expectedUpdatedAt/);
  assert.match(helper, /void input\.managerUserId/);
  assert.doesNotMatch(helper, /assigned_manager_id:\s*input\.managerUserId/);
  assert.doesNotMatch(helper, /\.from\("leads"\)[\s\S]*\.update\(/);
  assert.doesNotMatch(helper, /booking_id:\s*input|source:\s*input|phone:\s*input|name:\s*input/);

  assert.match(updateRpc, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(updateRpc, /public\.has_role\('owner'::public\.role_name\)/);
  assert.match(updateRpc, /public\.has_role\('administrator'::public\.role_name\)/);
  assert.match(updateRpc, /public\.has_role\('manager'::public\.role_name\)/);
  assert.match(updateRpc, /set status = p_status/);
  assert.match(updateRpc, /manager_comment = nullif\(btrim\(p_manager_comment\), ''\)/);
  assert.match(updateRpc, /assigned_manager_id = v_user_id/);
  assert.match(updateRpc, /l\.updated_at = p_expected_updated_at/);
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
