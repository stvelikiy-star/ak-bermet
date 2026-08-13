import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(import.meta.dirname, "production-preflight.mjs");

function run(args = [], env = process.env) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env,
  });
}

test("repository-only preflight is non-destructive and passes the approved migration/runtime contract", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /migration chain is exact and ordered \(20 files\)/);
  assert.match(result.stdout, /RESULT: PASS/);
  assert.match(result.stdout, /performs no network calls, backup, migration, deployment, or production writes/);
});

test("production-env mode fails closed without printing secret values", () => {
  const secretSentinel = "DO_NOT_PRINT_THIS_SECRET";
  const result = run(["--production-env"], {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    SUPABASE_SERVICE_ROLE_KEY: secretSentinel,
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /BLOCKED: production environment incomplete:/);
  assert.match(result.stderr, /SUPABASE_ACCESS_TOKEN/);
  assert.match(result.stderr, /AK_BERMET_DATABASE_URL/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretSentinel));
});

test("production-env mode passes the Supabase release contract without Google Sheets credentials", () => {
  const result = run(["--production-env"], {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    SUPABASE_ACCESS_TOKEN: "access-token-test",
    SUPABASE_PROJECT_REF: "project-ref-test",
    SUPABASE_DB_PASSWORD: "db-password-test",
    AK_BERMET_DATABASE_URL: "postgresql://example.invalid/db",
    AK_BERMET_BACKUP_APPROVED: "YES",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /required Supabase\/release environment names are present/);
  assert.match(result.stdout, /RESULT: PASS/);
  assert.doesNotMatch(result.stdout + result.stderr, /GOOGLE_SERVICE_ACCOUNT/);
  assert.doesNotMatch(result.stdout + result.stderr, /GOOGLE_SHEETS_ENABLED=true/);
});