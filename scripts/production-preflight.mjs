#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationDir = resolve(root, "supabase/migrations");

const EXPECTED_MIGRATIONS = [
  "20260721000100_extensions_and_enums.sql",
  "20260721000200_identity_and_roles.sql",
  "20260721000300_inventory.sql",
  "20260721000400_customers_leads.sql",
  "20260721000500_booking_core.sql",
  "20260721000600_booking_integrity.sql",
  "20260721000700_audit_and_integrations.sql",
  "20260721000800_rls_policies.sql",
  "20260721000900_seed_reference_data.sql",
  "20260722001100_operational_enums.sql",
  "20260722001200_cleaning.sql",
  "20260722001300_maintenance.sql",
  "20260722001400_room_inspections.sql",
  "20260722001500_attachments_and_history.sql",
  "20260722001600_operational_automation.sql",
  "20260722001700_operational_rls.sql",
  "20260727000100_manager_inspection_blocking_problem.sql",
  "20260728000100_availability_hold_atomicity.sql",
];

// Supabase is the authoritative durable application/CRM store. Google Sheets
// is an optional secondary synchronization destination and is intentionally
// not a production release hard gate.
const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_PASSWORD",
  "AK_BERMET_DATABASE_URL",
];

const failures = [];
const pass = (message) => console.log(`PASS: ${message}`);
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(resolve(root, path), "utf8");

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
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort();

if (JSON.stringify(actualMigrations) === JSON.stringify(EXPECTED_MIGRATIONS)) {
  pass(`migration chain is exact and ordered (${EXPECTED_MIGRATIONS.length} files)`);
} else {
  fail(
    `migration chain differs from the approved release set; expected ${EXPECTED_MIGRATIONS.length}, found ${actualMigrations.length}`,
  );
}

if (process.argv.includes("--production-env")) {
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

if (failures.length > 0) {
  for (const message of failures) console.error(`BLOCKED: ${message}`);
  process.exitCode = 2;
} else {
  console.log("RESULT: PASS");
  console.log("NOTE: this preflight performs no network calls, backup, migration, deployment, or production writes.");
}
