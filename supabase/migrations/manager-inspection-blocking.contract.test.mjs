import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "./20260727000100_manager_inspection_blocking_problem.sql",
  import.meta.url
);
const sql = await readFile(migrationUrl, "utf8");

test("manager blocking RPC keeps its security contract", () => {
  assert.match(sql, /function public\.fn_mark_inspection_blocking_problem\s*\(/i);
  assert.match(sql, /p\.is_active\s*=\s*true/i);
  assert.match(sql, /p\.deleted_at\s+is\s+null/i);
  assert.match(sql, /has_role\('owner'\)[\s\S]*has_role\('administrator'\)[\s\S]*has_role\('manager'\)/i);
  assert.match(sql, /security definer[\s\S]*set search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(sql, /from public\.room_units[\s\S]*for update/i);
  assert.match(sql, /blocks_room\s*=\s*true[\s\S]*status in \('reported', 'acknowledged', 'in_progress', 'on_hold', 'completed'\)/i);
  assert.match(sql, /revoke all on function public\.fn_mark_inspection_blocking_problem[\s\S]*from public/i);
  assert.match(sql, /grant execute on function public\.fn_mark_inspection_blocking_problem[\s\S]*to authenticated/i);
});
