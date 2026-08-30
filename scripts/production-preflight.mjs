#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationDir = resolve(root, "supabase/migrations");

const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_PASSWORD",
  "AK_BERMET_DATABASE_URL",
];

// These are explicit operator/owner attestations, not inferred state. Cutover
// must fail closed until each external release gate has been independently
// verified and set to the exact value YES in the cutover execution context.
const REQUIRED_CUTOVER_ATTESTATIONS = [
  "AK_BERMET_CUTOVER_APPROVED",
  "AK_BERMET_LIVE_BACKUP_VERIFIED",
  "AK_BERMET_PRICING_GAPS_RESOLVED",
  "AK_BERMET_LEGACY_BOOKINGS_RECONCILED",
  "AK_BERMET_COTTAGES_READINESS_CONFIRMED",
  "AK_BERMET_SHEETS_RUNTIME_VERIFIED",
  "AK_BERMET_BROWSER_UAT_PASSED",
  "AK_BERMET_AUTH_HARDENING_VERIFIED",
  "AK_BERMET_MAIN_PROTECTION_VERIFIED",
];

const failures = [];
const pass = (message) => console.log(`PASS: ${message}`);
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(resolve(root, path), "utf8");

const migrationManifest = JSON.parse(read("scripts/production-migrations-approved.json"));
const expectedMigrations = Array.isArray(migrationManifest.migrations)
  ? migrationManifest.migrations
  : [];
const migrationNamePattern = /^\d{14}_.+\.sql$/;
const manifestValid =
  migrationManifest.schema_version === 1 &&
  expectedMigrations.length > 0 &&
  expectedMigrations.every((name) => migrationNamePattern.test(name)) &&
  new Set(expectedMigrations).size === expectedMigrations.length &&
  JSON.stringify(expectedMigrations) === JSON.stringify([...expectedMigrations].sort());

if (manifestValid) pass("approved production migration manifest is valid, unique, and ordered");
else fail("approved production migration manifest is invalid, duplicated, or unordered");

const packageJson = JSON.parse(read("package.json"));
if (packageJson.engines?.node === ">=22.0.0") pass("Node runtime contract is >=22.0.0");
else fail("package.json must require Node >=22.0.0");

const dockerfile = read("Dockerfile");
const node22Stages = dockerfile.match(/^FROM node:22-alpine AS /gm) ?? [];
if (node22Stages.length === 3) pass("all Docker stages use Node 22 Alpine");
else fail("Dockerfile must use Node 22 Alpine for deps, builder, and runner");

for (const path of [
  "supabase/migrations/ak-bermet-production-backup.sh",
  "supabase/migrations/ak-bermet-production-backup.contract.test.mjs",
]) {
  if (existsSync(resolve(root, path))) pass(`${path} exists`);
  else fail(`${path} is missing`);
}

const actualMigrations = readdirSync(migrationDir)
  .filter((name) => migrationNamePattern.test(name))
  .sort();

if (manifestValid) {
  if (JSON.stringify(actualMigrations) === JSON.stringify(expectedMigrations)) {
    pass(`migration chain is exact and ordered (${expectedMigrations.length} files)`);
  } else {
    const expectedSet = new Set(expectedMigrations);
    const actualSet = new Set(actualMigrations);
    const missing = expectedMigrations.filter((name) => !actualSet.has(name));
    const unexpected = actualMigrations.filter((name) => !expectedSet.has(name));
    const detail = [
      `expected ${expectedMigrations.length}, found ${actualMigrations.length}`,
      missing.length ? `missing: ${missing.join(", ")}` : null,
      unexpected.length ? `unexpected: ${unexpected.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    fail(`migration chain differs from the approved release manifest; ${detail}`);
  }
}

const productionEnvMode = process.argv.includes("--production-env");
const cutoverReadinessMode = process.argv.includes("--cutover-readiness");

if (productionEnvMode || cutoverReadinessMode) {
  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]?.trim());
  if (process.env.AK_BERMET_BACKUP_APPROVED !== "YES") {
    missing.push("AK_BERMET_BACKUP_APPROVED=YES");
  }

  if (missing.length === 0) {
    pass("required Supabase/release environment names are present");
  } else {
    fail(`production environment incomplete: ${[...new Set(missing)].join(", ")}`);
  }
}

if (cutoverReadinessMode) {
  const blocked = REQUIRED_CUTOVER_ATTESTATIONS.filter(
    (name) => process.env[name] !== "YES",
  );

  if (blocked.length === 0) {
    pass(`cutover readiness attestations are explicitly YES (${REQUIRED_CUTOVER_ATTESTATIONS.length} gates)`);
  } else {
    fail(`cutover readiness incomplete or not YES: ${blocked.join(", ")}`);
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`BLOCKED: ${message}`);
  process.exitCode = 2;
} else {
  console.log("RESULT: PASS");
  if (cutoverReadinessMode) {
    console.log("NOTE: cutover attestations are operator-provided evidence claims; this preflight does not infer or bypass the underlying release gates.");
  }
  console.log("NOTE: this preflight performs no network calls, backup, migration, deployment, DNS changes, or production writes.");
}
