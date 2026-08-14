import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DEV_HOST,
  DEV_PROJECT_REF,
  EXPECTED_STAFF_SLOTS,
  ProvisioningError,
  main,
  readSecureManifest,
  validateDevEnvironment,
  validateManifest,
} from "./staff-auth-provisioner.mjs";

function makeManifest() {
  return {
    version: 1,
    project: "ak-bermet-dev",
    slots: EXPECTED_STAFF_SLOTS.map((entry, index) => ({
      slot: entry.slot,
      email: `uat-${String(index + 1).padStart(2, "0")}@akbermet.test.invalid`,
      password: `Qx!${String(index + 1).padStart(2, "0")}-9vL#T7m_Zp${String(100 + index)}`,
    })),
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof ProvisioningError && error.code === code);
}

test("staff slot contract is exactly 17 numbered role slots", () => {
  assert.equal(EXPECTED_STAFF_SLOTS.length, 17);
  const counts = Object.fromEntries(["owner", "administrator", "manager", "housekeeping", "technician"].map((role) => [role, 0]));
  for (const slot of EXPECTED_STAFF_SLOTS) counts[slot.role] += 1;
  assert.deepEqual(counts, { owner: 1, administrator: 1, manager: 4, housekeeping: 6, technician: 5 });
  assert.equal(EXPECTED_STAFF_SLOTS[0].label, "Собственник 1");
  assert.equal(EXPECTED_STAFF_SLOTS[1].label, "Администратор 1");
  assert.equal(EXPECTED_STAFF_SLOTS.at(-1).label, "Техник 5");
});

test("manifest supplies credentials only; labels and roles come from the fixed contract", () => {
  const entries = validateManifest(makeManifest());
  assert.equal(entries.length, 17);
  assert.equal(entries[2].label, "Менеджер 1");
  assert.equal(entries[2].role, "manager");
  assert.equal(entries[8].label, "Горничная 3");
});

test("manifest fails closed on missing slots, duplicate email, duplicate password and wrong project", () => {
  const missing = makeManifest();
  missing.slots.pop();
  expectCode(() => validateManifest(missing), "MANIFEST_SLOT_COUNT_INVALID");

  const duplicateEmail = makeManifest();
  duplicateEmail.slots[1].email = duplicateEmail.slots[0].email;
  expectCode(() => validateManifest(duplicateEmail), "MANIFEST_EMAIL_DUPLICATE");

  const duplicatePassword = makeManifest();
  duplicatePassword.slots[1].password = duplicatePassword.slots[0].password;
  expectCode(() => validateManifest(duplicatePassword), "MANIFEST_PASSWORD_DUPLICATE");

  const wrongProject = makeManifest();
  wrongProject.project = "production";
  expectCode(() => validateManifest(wrongProject), "MANIFEST_HEADER_INVALID");
});

test("execute environment is pinned to exact AK BERMET DEV project and two explicit gates", () => {
  expectCode(() => validateDevEnvironment({}), "EXECUTION_GATE_DISABLED");
  expectCode(
    () => validateDevEnvironment({ AK_BERMET_AUTH_PROVISION_ENABLED: "YES" }),
    "TARGET_GATE_NOT_DEV",
  );
  expectCode(
    () => validateDevEnvironment({
      AK_BERMET_AUTH_PROVISION_ENABLED: "YES",
      AK_BERMET_AUTH_TARGET: "DEV",
      NEXT_PUBLIC_SUPABASE_URL: "https://wrong.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-test-value",
    }),
    "SUPABASE_DEV_IDENTITY_MISMATCH",
  );

  const result = validateDevEnvironment({
    AK_BERMET_AUTH_PROVISION_ENABLED: "YES",
    AK_BERMET_AUTH_TARGET: "DEV",
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEV_HOST}`,
    SUPABASE_PROJECT_REF: DEV_PROJECT_REF,
    SUPABASE_SERVICE_ROLE_KEY: "secret-test-value",
  });
  assert.equal(result.url, `https://${DEV_HOST}`);
});

test("manifest file must be a regular owner file with private permissions", () => {
  const directory = mkdtempSync(join(tmpdir(), "ak-bermet-auth-manifest-"));
  const file = join(directory, "staff.json");
  try {
    writeFileSync(file, JSON.stringify(makeManifest()), { mode: 0o600 });
    assert.equal(readSecureManifest(file).length, 17);
    if (process.platform !== "win32") {
      chmodSync(file, 0o644);
      expectCode(() => readSecureManifest(file), "MANIFEST_PERMISSIONS_UNSAFE");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("default CLI mode is offline dry-run and needs no Supabase secret", async () => {
  const directory = mkdtempSync(join(tmpdir(), "ak-bermet-auth-dryrun-"));
  const file = join(directory, "staff.json");
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  try {
    writeFileSync(file, JSON.stringify(makeManifest()), { mode: 0o600 });
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("network must not be used in dry-run");
    };
    assert.equal(await main(["--manifest", file], {}), 0);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("source uses supported Auth Admin API and never directly writes auth.users", async () => {
  const source = await import("node:fs").then(({ readFileSync }) => readFileSync(new URL("./staff-auth-provisioner.mjs", import.meta.url), "utf8"));
  assert.match(source, /auth\.admin\.createUser/);
  assert.match(source, /auth\.admin\.deleteUser/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /from\("user_roles"\)/);
  assert.doesNotMatch(source, /from\(["']auth\.users["']\)/);
  assert.doesNotMatch(source, /insert\s+into\s+auth\.users/i);
  assert.doesNotMatch(source, /console\.(log|error).*entry\.(email|password)/);
});
