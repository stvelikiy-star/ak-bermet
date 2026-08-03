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
const sql = await readFile(migrationUrl, "utf8");
const atomicitySql = await readFile(atomicityMigrationUrl, "utf8");
const integritySql = await readFile(integrityMigrationUrl, "utf8");
const executableSql = sql.replace(/--.*$/gm, "");
const executableAtomicitySql = atomicitySql.replace(/--.*$/gm, "");
const executableIntegritySql = integritySql.replace(/--.*$/gm, "");
const signature =
  String.raw`public\.fn_create_availability_hold\(uuid,\s*date,\s*date,\s*uuid,\s*uuid,\s*text\)`;

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
    /where idempotency_key\s*=\s*p_idempotency_key[\s\S]*?return v_existing/i
  );
  assert.match(
    executableSql,
    /v_existing\.room_unit_id\s*<>\s*p_room_unit_id[\s\S]*?v_existing\.date_range\s*<>\s*v_range[\s\S]*?errcode\s*=\s*'AKB02'/i
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
