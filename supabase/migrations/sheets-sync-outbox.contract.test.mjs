import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  import.meta.dirname,
  "20260813054000_sheets_sync_outbox_plumbing.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const lower = sql.toLowerCase();

const triggerTargets = new Map([
  ["buildings", "Корпуса"],
  ["room_units", "Номера"],
  ["customers", "Клиенты"],
  ["bookings", "Бронирования"],
  ["booking_rooms", "05_Бронь_Номера"],
  ["availability_holds", "06_Удержания"],
  ["cleaning_tasks", "Уборка"],
  ["maintenance_requests", "Ремонт"],
  ["room_inspections", "10_Проверки"],
]);

test("outbox trigger queues only Supabase-to-Sheets identifiers, not row payloads", () => {
  assert.match(lower, /insert into public\.sheets_sync_queue/);
  assert.match(lower, /'supabase_to_sheets'/);
  assert.match(lower, /v_entity_id := old\.id/);
  assert.match(lower, /v_entity_id := new\.id/);
  assert.doesNotMatch(lower, /to_jsonb\((new|old)\)/);
  assert.doesNotMatch(lower, /sheets_to_supabase/);
});

test("all approved direct mirror datasets enqueue transactionally", () => {
  for (const [table, sheet] of triggerTargets) {
    assert.ok(
      lower.includes(`after insert or update or delete on public.${table}`),
      `missing mirror trigger for ${table}`,
    );
    assert.ok(
      sql.includes(`public.fn_enqueue_sheets_sync('${sheet}')`),
      `missing exact target sheet for ${table}`,
    );
  }
});

test("claim RPC is bounded and concurrency-safe", () => {
  assert.match(lower, /fn_claim_sheets_sync_batch/);
  assert.match(lower, /p_limit < 1 or p_limit > 100/);
  assert.match(lower, /for update skip locked/);
  assert.match(lower, /status = 'in_progress'/);
  assert.match(lower, /attempts = q\.attempts \+ 1/);
});

test("finish RPC records immutable attempt history and bounded retries", () => {
  assert.match(lower, /fn_finish_sheets_sync/);
  assert.match(lower, /insert into public\.sheets_sync_history/);
  assert.match(lower, /v_item\.attempts >= p_max_attempts/);
  assert.match(lower, /v_queue_status := 'pending'/);
  assert.match(lower, /v_queue_status := 'failed'/);
  assert.match(lower, /v_queue_status := 'success'/);
  assert.match(lower, /left\(coalesce\(p_error/);
});

test("all new SECURITY DEFINER helpers are service-role only with fixed search_path", () => {
  const signatures = [
    "public.fn_enqueue_sheets_sync()",
    "public.fn_claim_sheets_sync_batch(integer)",
    "public.fn_finish_sheets_sync(uuid, boolean, text, jsonb, integer)",
  ];

  assert.equal((lower.match(/security definer/g) ?? []).length, signatures.length);
  assert.equal(
    (lower.match(/set search_path = public, pg_temp/g) ?? []).length,
    signatures.length,
  );

  for (const signature of signatures) {
    assert.ok(
      lower.includes(`revoke all on function ${signature} from public, anon, authenticated;`),
      `missing public/anon/authenticated revoke for ${signature}`,
    );
    assert.ok(
      lower.includes(`grant execute on function ${signature} to service_role;`),
      `missing service-role grant for ${signature}`,
    );
    assert.ok(
      !lower.includes(`grant execute on function ${signature} to authenticated`),
      `internal mirror helper must not be granted to authenticated: ${signature}`,
    );
  }
});

test("migration performs no external Google API call and preserves DB authority", () => {
  assert.doesNotMatch(lower, /googleapis/);
  assert.doesNotMatch(lower, /http_post|net\.http|pg_net/);
  assert.match(lower, /worker will always re-read the current authoritative row/);
});