import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync(
  new URL("./route.ts", import.meta.url),
  "utf8",
);
const persistenceSource = readFileSync(
  new URL("../../../lib/public-lead-persistence.ts", import.meta.url),
  "utf8",
);
const rpcMigrationSource = readFileSync(
  new URL("../../../../supabase/migrations/20260913073000_remove_web_service_role_dependency.sql", import.meta.url),
  "utf8",
);

test("lead API reports success only after authoritative Supabase persistence", () => {
  const persistIndex = routeSource.indexOf("await persistPublicLead(lead)");
  const successIndex = routeSource.lastIndexOf(
    "NextResponse.json({ ok: true, leadId: persistedLead.id })",
  );

  assert.notEqual(persistIndex, -1);
  assert.notEqual(successIndex, -1);
  assert.ok(successIndex > persistIndex);
  assert.match(routeSource, /status:\s*503/);
});

test("public request path never calls Google Sheets directly", () => {
  assert.doesNotMatch(routeSource, /appendLeadToSheet/);
  assert.doesNotMatch(routeSource, /isGoogleSheetsEnabled/);
  assert.doesNotMatch(routeSource, /@\/lib\/google-sheets/);
  assert.match(routeSource, /Google Sheets mirroring is asynchronous through the/);
  assert.match(routeSource, /DB outbox/);
});

test("lead persistence errors are not serialized into logs", () => {
  assert.match(routeSource, /console\.error\("\[LEAD\] Supabase durable insert failed"\)/);
  assert.doesNotMatch(routeSource, /console\.error\([^\n]*,\s*error/);
  assert.doesNotMatch(routeSource, /console\.warn/);
});

test("public lead persistence uses the narrow RPC instead of direct table insert", () => {
  assert.match(persistenceSource, /\.rpc\("fn_public_create_lead"/);
  assert.match(persistenceSource, /p_source:\s*lead\.source/);
  assert.match(persistenceSource, /p_interest:\s*lead\.interest/);
  assert.match(persistenceSource, /p_name:\s*lead\.name/);
  assert.match(persistenceSource, /p_phone:\s*lead\.phone/);
  assert.doesNotMatch(persistenceSource, /\.from\("leads"\)/);
  assert.doesNotMatch(persistenceSource, /getSupabaseAdminClient/);
});

test("lead RPC owns the safe allowlist and forces new status", () => {
  assert.match(rpcMigrationSource, /create or replace function public\.fn_public_create_lead/);
  assert.match(rpcMigrationSource, /insert into public\.leads as l\(/);
  assert.match(rpcMigrationSource, /source, interest, status, name, phone,/);
  assert.match(rpcMigrationSource, /p_source, p_interest, 'new', btrim\(p_name\), btrim\(p_phone\)/);
  assert.doesNotMatch(rpcMigrationSource, /assigned_manager_id\s*,/);
  assert.doesNotMatch(rpcMigrationSource, /booking_id\s*,/);
  assert.doesNotMatch(rpcMigrationSource, /customer_id\s*,/);
});

test("unresolved room category is preserved by the RPC instead of losing the lead", () => {
  assert.match(rpcMigrationSource, /Категория номера:/);
  assert.match(rpcMigrationSource, /v_category_id := null/);
  assert.match(rpcMigrationSource, /v_message := concat_ws/);
  assert.match(rpcMigrationSource, /p_room_category_name/);
});
