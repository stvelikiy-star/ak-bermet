import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  import.meta.dirname,
  "20260813064000_leads_sheets_outbox.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const lower = sql.toLowerCase();

test("public leads enqueue only after committed row mutation through the shared outbox trigger", () => {
  assert.match(lower, /after insert or update or delete on public\.leads/);
  assert.ok(sql.includes("public.fn_enqueue_sheets_sync('07_Лиды')"));
  assert.match(lower, /drop trigger if exists trg_sheets_sync_leads/);
});

test("lead outbox migration performs no Google API or reverse Sheets writes", () => {
  assert.doesNotMatch(lower, /googleapis|sheets_to_supabase|http_post|pg_net|net\.http/);
  assert.doesNotMatch(lower, /insert into public\.leads|update public\.leads|delete from public\.leads/);
});
