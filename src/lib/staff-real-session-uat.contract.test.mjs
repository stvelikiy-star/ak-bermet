import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { STAFF_SLOTS } from "../data/staff-slots.ts";
import {
  DEV_BASE_URL,
  DEV_PROJECT_REF,
  UatBlocked,
  buildNetworkConfig,
  parseArgs,
  readAllowedEnvFile,
  readSecureManifest,
  validateManifest,
  validateRlsContracts,
} from "./staff-real-session-uat.mjs";

function emailFor(slot) {
  const [role, number] = slot.split("-");
  return `${role}${number}@staff.akbermet.invalid`;
}

function validManifest() {
  return {
    version: 1,
    project: "ak-bermet-dev",
    slots: STAFF_SLOTS.map((slot, index) => ({
      slot: slot.id,
      email: emailFor(slot.id),
      password: `UatOnly-${index + 1}-strong-password-value`,
    })),
  };
}

function expectBlocked(fn, code) {
  assert.throws(fn, (error) => error instanceof UatBlocked && error.code === code);
}

test("staff source-of-truth is exactly the approved 17-slot contract", () => {
  assert.equal(STAFF_SLOTS.length, 17);
  const counts = Object.fromEntries(["owner", "administrator", "manager", "housekeeping", "technician"].map((role) => [role, 0]));
  for (const slot of STAFF_SLOTS) counts[slot.role] += 1;
  assert.deepEqual(counts, { owner: 1, administrator: 1, manager: 4, housekeeping: 6, technician: 5 });
  assert.deepEqual(STAFF_SLOTS.map((slot) => slot.label), [
    "Собственник 1",
    "Администратор 1",
    "Менеджер 1",
    "Менеджер 2",
    "Менеджер 3",
    "Менеджер 4",
    "Горничная 1",
    "Горничная 2",
    "Горничная 3",
    "Горничная 4",
    "Горничная 5",
    "Горничная 6",
    "Техник 1",
    "Техник 2",
    "Техник 3",
    "Техник 4",
    "Техник 5",
  ]);
});

test("manifest validation accepts only exact slots and fixed DEV login identifiers", () => {
  const entries = validateManifest(validManifest());
  assert.equal(entries.length, 17);
  assert.equal(entries[0].slot, "owner-1");
  assert.equal(entries[0].label, "Собственник 1");
  assert.equal(entries[0].role, "owner");
  assert.equal(entries[16].slot, "technician-5");

  const wrongEmail = validManifest();
  wrongEmail.slots[0].email = "someone@example.com";
  expectBlocked(() => validateManifest(wrongEmail), "MANIFEST_EMAIL_MISMATCH");

  const duplicatePassword = validManifest();
  duplicatePassword.slots[1].password = duplicatePassword.slots[0].password;
  expectBlocked(() => validateManifest(duplicatePassword), "MANIFEST_PASSWORD_DUPLICATE");
});

test("secure manifest must be a regular owner-only 0600 file", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-bermet-uat-"));
  const path = join(dir, "manifest.json");
  try {
    writeFileSync(path, JSON.stringify(validManifest()), { mode: 0o600 });
    assert.equal(readSecureManifest(path).length, 17);
    if (process.platform !== "win32") {
      chmodSync(path, 0o644);
      expectBlocked(() => readSecureManifest(path), "FILE_PERMISSIONS_UNSAFE");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("env parser is allowlisted and never imports service-role or shell variables", () => {
  const dir = mkdtempSync(join(tmpdir(), "ak-bermet-uat-env-"));
  const path = join(dir, "uat.env");
  try {
    writeFileSync(
      path,
      [
        `NEXT_PUBLIC_SUPABASE_URL=${DEV_BASE_URL}`,
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_value",
        `SUPABASE_PROJECT_REF=${DEV_PROJECT_REF}`,
        "SUPABASE_SERVICE_ROLE_KEY=must-not-be-read",
        "NODE_OPTIONS=--require=/tmp/evil.js",
        "OTHER=$(touch /tmp/should-never-run)",
      ].join("\n"),
      { mode: 0o600 },
    );
    const values = readAllowedEnvFile(path);
    assert.deepEqual(values, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_BASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value",
      SUPABASE_PROJECT_REF: DEV_PROJECT_REF,
    });
    assert.equal(Object.hasOwn(values, "SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(Object.hasOwn(values, "NODE_OPTIONS"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("network execution is double-gated and pinned to exact DEV base URL", () => {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: DEV_BASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value",
    SUPABASE_PROJECT_REF: DEV_PROJECT_REF,
  };
  expectBlocked(() => buildNetworkConfig(values, {}), "EXECUTION_GATE_DISABLED");
  expectBlocked(
    () => buildNetworkConfig(values, { AK_BERMET_STAFF_UAT_ENABLED: "YES" }),
    "TARGET_GATE_NOT_DEV",
  );
  assert.deepEqual(
    buildNetworkConfig(values, {
      AK_BERMET_STAFF_UAT_ENABLED: "YES",
      AK_BERMET_STAFF_UAT_TARGET: "DEV",
    }),
    { url: DEV_BASE_URL, publishableKey: "sb_publishable_test_value" },
  );

  const restEndpoint = { ...values, NEXT_PUBLIC_SUPABASE_URL: `${DEV_BASE_URL}/rest/v1/` };
  expectBlocked(
    () => buildNetworkConfig(restEndpoint, { AK_BERMET_STAFF_UAT_ENABLED: "YES", AK_BERMET_STAFF_UAT_TARGET: "DEV" }),
    "SUPABASE_DEV_IDENTITY_MISMATCH",
  );
});

test("RLS static contract proves management and owner-only boundaries without test data writes", () => {
  assert.equal(validateRlsContracts(process.cwd()), 8);
});

test("harness source contains no admin Auth API, service-role key, or business write calls", () => {
  const source = readFileSync(resolve("src/lib/staff-real-session-uat.mjs"), "utf8");
  assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(source.includes("auth.admin"), false);
  assert.equal(source.includes(".insert("), false);
  assert.equal(source.includes(".update("), false);
  assert.equal(source.includes(".delete("), false);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /client\.rpc\("has_role"/);
});

test("offline is the default and network mode requires an explicit env file", () => {
  assert.deepEqual(parseArgs(["--manifest", "/safe/manifest.json"]), {
    manifest: "/safe/manifest.json",
    envFile: "",
    execute: false,
  });
  expectBlocked(
    () => parseArgs(["--manifest", "/safe/manifest.json", "--execute"]),
    "ENV_FILE_ARGUMENT_REQUIRED",
  );
});
