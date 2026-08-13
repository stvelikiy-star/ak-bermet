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

test("public Supabase lead insert uses an explicit safe field allowlist", () => {
  assert.match(persistenceSource, /\.from\("leads"\)/);
  assert.match(persistenceSource, /\.insert\(payload\)/);
  assert.match(persistenceSource, /\.select\("id, lead_number"\)/);
  assert.match(persistenceSource, /\.single\(\)/);
  assert.match(persistenceSource, /room_category_id:\s*roomCategoryId/);
  assert.doesNotMatch(persistenceSource, /assigned_manager_id\s*:/);
  assert.doesNotMatch(persistenceSource, /booking_id\s*:/);
  assert.doesNotMatch(persistenceSource, /id:\s*lead\.id/);
});

test("unresolved room category is preserved instead of losing the lead", () => {
  assert.match(persistenceSource, /Категория номера:/);
  assert.match(persistenceSource, /roomCategoryId:\s*null/);
  assert.match(persistenceSource, /preserveUnresolvedRoomCategory\(lead\)/);
});
