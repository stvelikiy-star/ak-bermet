import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve(import.meta.dirname, "local-auth-preflight.mjs");

function run(envFile, extraEnv = {}) {
  return spawnSync(process.execPath, [script, "--env-file", envFile], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...extraEnv },
  });
}

test("fails closed when the local env file is missing", () => {
  const result = run("/tmp/ak-bermet-definitely-missing-local-env");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /\.env\.local is missing/);
});

test("passes with a valid remote Supabase public auth configuration without printing values", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-bermet-local-auth-"));
  const envFile = join(dir, ".env.local");
  const keySentinel = "sb_publishable_TEST_SECRET_SHOULD_NOT_PRINT_123456789";
  const urlSentinel = "https://exampleproject.supabase.co";
  writeFileSync(
    envFile,
    `NEXT_PUBLIC_SUPABASE_URL=${urlSentinel}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${keySentinel}\n`,
  );

  const result = run(envFile);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /RESULT: PASS/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(keySentinel));
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(urlSentinel.replaceAll(".", "\\.")));
});

test("rejects a placeholder publishable key without echoing it", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-bermet-local-auth-"));
  const envFile = join(dir, ".env.local");
  const placeholder = "replace-me";
  writeFileSync(
    envFile,
    `NEXT_PUBLIC_SUPABASE_URL=https://exampleproject.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${placeholder}\n`,
  );

  const result = run(envFile);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /still looks like a placeholder/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(placeholder));
});
