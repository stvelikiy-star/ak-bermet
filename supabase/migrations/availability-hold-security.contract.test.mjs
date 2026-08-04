import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "./20260804000100_availability_hold_security.sql",
  import.meta.url
);
const atomicityMigrationUrl = new URL(
  "./20260728000100_availability_hold_atomicity.sql",
  import.meta.url
);
const integrityMigrationUrl = new URL(
  "./20260721000600_booking_integrity.sql",
  import.meta.url
);
const sheetsSyncMigrationUrl = new URL(
  "./20260804000200_sheets_booking_occupancy_sync.sql",
  import.meta.url
);
const sql = await readFile(migrationUrl, "utf8");
const atomicitySql = await readFile(atomicityMigrationUrl, "utf8");
const integritySql = await readFile(integrityMigrationUrl, "utf8");
const sheetsSyncSql = await readFile(sheetsSyncMigrationUrl, "utf8");
const executableSql = sql.replace(/--.*$/gm, "");
const executableAtomicitySql = atomicitySql.replace(/--.*$/gm, "");
const executableIntegritySql = integritySql.replace(/--.*$/gm, "");
const executableSheetsSyncSql = sheetsSyncSql.replace(/--.*$/gm, "");
const signature =
  String.raw`public\.fn_create_availability_hold\(uuid,\s*date,\s*date,\s*uuid,\s*uuid,\s*text\)`;

test("durable holds expose dates derived from the authoritative range", () => {
  assert.match(
    executableSql,
    /alter table public\.availability_holds[\s\S]*?add column check_in date generated always as \(lower\(date_range\)\) stored[\s\S]*?add column check_out date generated always as \(upper\(date_range\)\) stored/i
  );
  assert.doesNotMatch(
    executableSql,
    /insert into public\.availability_holds\s*\([^)]*\bcheck_(?:in|out)\b/i
  );
});

test("hold RPC uses invoker rights and is executable only by service_role", () => {
  assert.match(executableSql, /security invoker/i);
  assert.doesNotMatch(executableSql, /security definer/i);
  assert.match(
    executableSql,
    /set search_path\s*=\s*pg_catalog,\s*public,\s*pg_temp/i
  );
  assert.match(
    executableSql,
    new RegExp(String.raw`revoke all on function ${signature} from public\s*;`, "i")
  );
  assert.match(
    executableSql,
    new RegExp(String.raw`revoke all on function ${signature} from anon\s*;`, "i")
  );
  assert.match(
    executableSql,
    new RegExp(
      String.raw`revoke all on function ${signature} from authenticated\s*;`,
      "i"
    )
  );
  assert.match(
    executableSql,
    new RegExp(
      String.raw`grant execute on function ${signature} to service_role\s*;`,
      "i"
    )
  );

  const executeGrantees = [
    ...executableSql.matchAll(
      /grant\s+execute\s+on\s+function\s+public\.fn_create_availability_hold\([^;]+?\)\s+to\s+([a-z_][a-z0-9_]*)\s*;/gi
    ),
  ].map((match) => match[1].toLowerCase());
  assert.deepEqual(executeGrantees, ["service_role"]);
  assert.match(
    executableSql,
    /revoke insert,\s*update,\s*delete on table public\.availability_holds from anon\s*;/i
  );
  assert.match(
    executableSql,
    /revoke insert,\s*update,\s*delete on table public\.availability_holds from authenticated\s*;/i
  );
});

test("room eligibility is locked before expiration and insertion", () => {
  assert.match(
    executableSql,
    /from public\.room_units ru[\s\S]*?where ru\.id\s*=\s*p_room_unit_id[\s\S]*?for update\s*;/i
  );
  assert.match(executableSql, /ru\.deleted_at\s+is\s+null/i);
  assert.match(executableSql, /ru\.sellable_status\s*=\s*'active'/i);
  assert.match(executableSql, /ru\.operational_status\s*=\s*'ready'/i);
  assert.match(
    executableSql,
    /if not found then[\s\S]*?using errcode\s*=\s*'AKB03'/i
  );

  const lockAt = executableSql.search(/from public\.room_units ru/i);
  const expireAt = executableSql.search(/update public\.availability_holds/i);
  const insertAt = executableSql.search(/insert into public\.availability_holds/i);
  assert.ok(lockAt >= 0 && lockAt < expireAt && expireAt < insertAt);
});

test("date range is validated and remains half-open", () => {
  assert.match(
    executableSql,
    /p_check_in is null or p_check_out is null[\s\S]*?errcode\s*=\s*'AKB01'/i
  );
  assert.match(
    executableSql,
    /p_check_out\s*<=\s*p_check_in[\s\S]*?errcode\s*=\s*'AKB01'/i
  );
  assert.match(
    executableSql,
    /daterange\(p_check_in,\s*p_check_out,\s*'\[\)'\)/i
  );
});

test("hold expiry and idempotency behavior remain explicit", () => {
  assert.match(executableSql, /now\(\)\s*\+\s*interval\s*'60 minutes'/i);
  assert.match(
    executableSql,
    /update public\.availability_holds[\s\S]*?status\s*=\s*'active'[\s\S]*?expires_at\s*<=\s*now\(\)/i
  );
  assert.match(
    executableSql,
    /where idempotency_key\s*=\s*v_idempotency_key[\s\S]*?return v_existing/i
  );
  assert.match(
    executableSql,
    /v_existing\.room_unit_id\s*<>\s*p_room_unit_id[\s\S]*?v_existing\.date_range\s*<>\s*v_range[\s\S]*?errcode\s*=\s*'AKB06'/i
  );
  assert.match(
    executableSql,
    /v_idempotency_key\s*:=\s*btrim\(p_idempotency_key\)[\s\S]*?length\(v_idempotency_key\)\s*>\s*200[\s\S]*?errcode\s*=\s*'AKB05'/i
  );
  assert.match(executableSql, /when unique_violation then/i);
  assert.match(
    executableAtomicitySql,
    /create unique index availability_holds_idempotency_key_key[\s\S]*?on public\.availability_holds\s*\(idempotency_key\)[\s\S]*?where idempotency_key is not null/i
  );
});

test("overlap protection preserves PostgreSQL exclusion conflicts", () => {
  assert.match(executableSql, /when exclusion_violation then/i);
  assert.match(
    executableSql,
    /hold_conflict:[\s\S]*?using errcode\s*=\s*'23P01'/i
  );
  assert.match(
    executableIntegritySql,
    /exclude using gist\s*\(room_unit_id with =,\s*period with &&\)\s*where\s*\(status = 'active'\)/i
  );
  assert.match(
    executableIntegritySql,
    /insert into public\.occupancy_periods\s*\(room_unit_id,\s*period,\s*period_type,\s*availability_hold_id\)[\s\S]*?values\s*\(new\.room_unit_id,\s*new\.date_range,\s*'hold',\s*new\.id\)/i
  );
  assert.match(
    executableIntegritySql,
    /create trigger trg_holds_occupancy[\s\S]*?after insert or update of status on public\.availability_holds/i
  );
});

test("Sheets occupancy uses stable external identity and explicit room UUIDs", () => {
  assert.match(
    executableSheetsSyncSql,
    /create table public\.sheets_booking_occupancies[\s\S]*?external_booking_id text not null unique[\s\S]*?room_unit_id uuid not null references public\.room_units\(id\)/i
  );
  assert.match(
    executableSheetsSyncSql,
    /source_updated_at timestamptz not null/i
  );
  assert.doesNotMatch(
    executableSheetsSyncSql,
    /room_number|building_id|room_category_id/i
  );
  assert.match(
    executableSheetsSyncSql,
    /alter table public\.sheets_booking_occupancies enable row level security/i
  );
});

test("Sheets bookings project into the existing exclusion-protected occupancy table", () => {
  assert.match(
    executableSheetsSyncSql,
    /add column sheets_booking_occupancy_id uuid[\s\S]*?references public\.sheets_booking_occupancies\(id\)/i
  );
  assert.match(
    executableSheetsSyncSql,
    /insert into public\.occupancy_periods[\s\S]*?sheets_booking_occupancy_id[\s\S]*?daterange\(new\.check_in,\s*new\.check_out,\s*'\[\)'\)[\s\S]*?'booking'/i
  );
  assert.match(
    executableSheetsSyncSql,
    /new\.blocks_availability\s*=\s*false[\s\S]*?set status\s*=\s*'cancelled'/i
  );
  assert.match(
    executableIntegritySql,
    /exclude using gist\s*\(room_unit_id with =,\s*period with &&\)\s*where\s*\(status = 'active'\)/i
  );
});

test("replayed and out-of-order Sheets events cannot duplicate or overwrite newer state", () => {
  assert.match(
    executableSheetsSyncSql,
    /pg_advisory_xact_lock[\s\S]*?hashtextextended\(btrim\(p_external_booking_id\),\s*0\)/i
  );
  assert.match(
    executableSheetsSyncSql,
    /p_source_updated_at\s*<\s*v_existing\.source_updated_at[\s\S]*?return v_existing/i
  );
  assert.match(
    executableSheetsSyncSql,
    /p_source_updated_at\s*=\s*v_existing\.source_updated_at[\s\S]*?event_fingerprint\s*=\s*p_event_fingerprint[\s\S]*?return v_existing[\s\S]*?errcode\s*=\s*'AKB04'/i
  );
});

test("complete Sheets snapshots durably reconcile deleted bookings before hold creation", () => {
  assert.match(
    executableSheetsSyncSql,
    /create table public\.sheets_booking_snapshot_state[\s\S]*?snapshot_started_at timestamptz[\s\S]*?snapshot_events jsonb/i
  );
  assert.match(
    executableSheetsSyncSql,
    /alter table public\.sheets_booking_snapshot_state enable row level security[\s\S]*?revoke all on table public\.sheets_booking_snapshot_state from public/i
  );
  assert.match(
    executableSheetsSyncSql,
    /from public\.sheets_booking_snapshot_state[\s\S]*?where singleton\s*=\s*true[\s\S]*?for update/i
  );

  const releaseAt = executableSheetsSyncSql.search(
    /update public\.occupancy_periods\s+set status\s*=\s*'cancelled'\s+where sheets_booking_occupancy_id is not null\s+and status\s*=\s*'active'/i
  );
  const reconcileAt = executableSheetsSyncSql.search(
    /delete from public\.sheets_booking_occupancies as stored[\s\S]*?where not exists/i
  );
  const applyAt = executableSheetsSyncSql.search(
    /perform public\.fn_apply_sheets_booking_event/i
  );
  const reprojectAt = executableSheetsSyncSql.search(
    /update public\.sheets_booking_occupancies\s+set blocks_availability\s*=\s*blocks_availability\s+where blocks_availability\s*=\s*true/i
  );
  const projectionCleanupAt = executableSheetsSyncSql.search(
    /delete from public\.occupancy_periods\s+where sheets_booking_occupancy_id is not null\s+and status\s*=\s*'cancelled'/i
  );
  const fenceUpdateAt = executableSheetsSyncSql.search(
    /update public\.sheets_booking_snapshot_state[\s\S]*?snapshot_started_at\s*=\s*p_snapshot_started_at/i
  );
  const holdAt = executableSheetsSyncSql.search(
    /v_hold\s*:=\s*public\.fn_create_availability_hold/i
  );
  assert.ok(releaseAt >= 0 && releaseAt < reconcileAt);
  assert.ok(reconcileAt < applyAt && applyAt < projectionCleanupAt);
  assert.ok(projectionCleanupAt < reprojectAt);
  assert.ok(reprojectAt < fenceUpdateAt && fenceUpdateAt < holdAt);
  assert.match(
    executableSheetsSyncSql,
    /jsonb_array_elements\(p_events\)[\s\S]*?external_booking_id[\s\S]*?stored\.external_booking_id/i
  );
});

test("delayed and ambiguous snapshots fail closed under the durable fence", () => {
  assert.match(
    executableSheetsSyncSql,
    /p_snapshot_started_at\s*<\s*v_snapshot_state\.snapshot_started_at[\s\S]*?stale Sheets snapshot[\s\S]*?errcode\s*=\s*'AKB04'/i
  );
  assert.match(
    executableSheetsSyncSql,
    /p_snapshot_started_at\s*=\s*v_snapshot_state\.snapshot_started_at[\s\S]*?p_events\s*<>\s*v_snapshot_state\.snapshot_events[\s\S]*?ambiguous Sheets snapshot version[\s\S]*?errcode\s*=\s*'AKB04'/i
  );
  assert.match(
    executableSheetsSyncSql,
    /count\(\*\)[\s\S]*?count\(distinct btrim\(value ->> 'external_booking_id'\)\)[\s\S]*?errcode\s*=\s*'AKB04'/i
  );
  assert.match(
    executableSheetsSyncSql,
    /join jsonb_array_elements\(p_events\)[\s\S]*?source_updated_at'\)::timestamptz\s*<\s*stored\.source_updated_at[\s\S]*?stale Sheets booking version in snapshot[\s\S]*?errcode\s*=\s*'AKB04'/i
  );
});

test("Sheets sync releases stale hold projections before applying a newer event", () => {
  const cleanupAt = executableSheetsSyncSql.search(
    /update public\.availability_holds[\s\S]*?expires_at\s*<=\s*now\(\)/i
  );
  const eventUpdateAt = executableSheetsSyncSql.search(
    /update public\.sheets_booking_occupancies[\s\S]*?set room_unit_id\s*=\s*p_room_unit_id/i
  );
  const eventInsertAt = executableSheetsSyncSql.search(
    /insert into public\.sheets_booking_occupancies/i
  );
  assert.ok(cleanupAt >= 0 && cleanupAt < eventUpdateAt);
  assert.ok(cleanupAt < eventInsertAt);
});

test("Sheets synchronization and hold creation are one service-role-only transaction", () => {
  const signature = String.raw`public\.fn_sync_sheets_bookings_and_create_availability_hold\(\s*jsonb,\s*timestamptz,\s*uuid,\s*date,\s*date,\s*uuid,\s*uuid,\s*text\s*\)`;
  const applyAt = executableSheetsSyncSql.search(
    /perform public\.fn_apply_sheets_booking_event/i
  );
  const holdAt = executableSheetsSyncSql.search(
    /v_hold\s*:=\s*public\.fn_create_availability_hold/i
  );
  assert.ok(applyAt >= 0 && applyAt < holdAt);
  assert.match(executableSheetsSyncSql, /security invoker/i);
  assert.match(
    executableSheetsSyncSql,
    new RegExp(String.raw`revoke all on function ${signature} from public\s*;`, "i")
  );
  assert.match(
    executableSheetsSyncSql,
    new RegExp(String.raw`revoke all on function ${signature} from anon\s*;`, "i")
  );
  assert.match(
    executableSheetsSyncSql,
    new RegExp(
      String.raw`revoke all on function ${signature} from authenticated\s*;`,
      "i"
    )
  );
  assert.match(
    executableSheetsSyncSql,
    new RegExp(String.raw`grant execute on function ${signature} to service_role\s*;`, "i")
  );
});
