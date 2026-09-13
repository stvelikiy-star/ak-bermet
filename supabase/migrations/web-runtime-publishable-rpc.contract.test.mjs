import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const migration = readFileSync(
  resolve(import.meta.dirname, "20260913073000_remove_web_service_role_dependency.sql"),
  "utf8",
).toLowerCase();

const runtimeFiles = [
  "src/app/api/availability/route.ts",
  "src/app/manager/qr/page.tsx",
  "src/app/api/manager/guest-qr/route.ts",
  "src/app/api/guest/requests/route.ts",
  "src/app/api/manager/guest-requests/route.ts",
  "src/lib/guest-qr.ts",
  "src/lib/public-lead-persistence.ts",
  "src/lib/manager-leads-supabase.ts",
  "src/lib/operations-data.ts",
];

const publicFunctions = [
  "public.fn_public_availability(date, date, integer, text)",
  "public.fn_public_guest_room_context(text)",
  "public.fn_public_create_guest_request(text, text, text)",
];
const managerFunctions = [
  "public.fn_manager_rotate_guest_room_access_token(uuid, uuid, text, text)",
  "public.fn_manager_revoke_guest_room_access_token(uuid)",
  "public.fn_manager_update_lead(uuid, public.lead_status, text, timestamptz)",
];

test("normal web runtime never imports the service-role admin client", () => {
  for (const relative of runtimeFiles) {
    const source = readFileSync(resolve(root, relative), "utf8");
    assert.doesNotMatch(source, /getSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/, relative);
  }
});

test("public config contains only public Supabase configuration", () => {
  const source = readFileSync(resolve(root, "src/lib/supabase/public-config.ts"), "utf8");
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /sb_publishable_/);
  assert.doesNotMatch(source, /SERVICE_ROLE|service_role/);
});

test("new SECURITY DEFINER RPCs pin search_path", () => {
  const occurrences = migration.match(/security definer\s+set search_path = ''/g) ?? [];
  assert.equal(occurrences.length, 7);
});

test("public RPCs have explicit anon/authenticated grants and no PUBLIC grant", () => {
  for (const signature of publicFunctions) {
    assert.ok(
      migration.includes(`revoke all on function ${signature} from public, anon, authenticated;`),
      `missing revoke for ${signature}`,
    );
    assert.ok(
      migration.includes(`grant execute on function ${signature} to anon, authenticated;`),
      `missing public-role grant for ${signature}`,
    );
  }
});

test("manager RPCs deny anon and are authenticated-only", () => {
  for (const signature of managerFunctions) {
    assert.ok(
      migration.includes(`revoke all on function ${signature} from public, anon, authenticated;`),
      `missing revoke for ${signature}`,
    );
    assert.ok(
      migration.includes(`grant execute on function ${signature} to authenticated;`),
      `missing authenticated-only grant for ${signature}`,
    );
    assert.ok(
      !migration.includes(`grant execute on function ${signature} to anon`),
      `manager RPC must never be anonymous: ${signature}`,
    );
  }
});

test("guest context exposes no phone/email/raw token", () => {
  const start = migration.indexOf("create or replace function public.fn_public_guest_room_context");
  const end = migration.indexOf("revoke all on function public.fn_public_guest_room_context", start);
  const fn = migration.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(fn, /phone|email|token_hash\s+text\s*,/);
  assert.match(fn, /p_token_hash text/);
});

test("availability stays active-ready and guest QR expires at official 11:00 checkout", () => {
  assert.match(migration, /ru\.sellable_status = 'active'/);
  assert.match(migration, /ru\.operational_status = 'ready'/);
  assert.match(migration, /v_expires_at := \(v_check_out \+ time '11:00'\) at time zone 'asia\/bishkek'/);
});
