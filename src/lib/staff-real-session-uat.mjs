#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { STAFF_SLOTS } from "../data/staff-slots.ts";

export const DEV_PROJECT_REF = "ednqgzgjhnalsiiuekmw";
export const DEV_BASE_URL = `https://${DEV_PROJECT_REF}.supabase.co`;
export const EXPECTED_PROJECT = "ak-bermet-dev";
export const ROLE_NAMES = Object.freeze([
  "owner",
  "administrator",
  "manager",
  "housekeeping",
  "technician",
]);

const ALLOWED_ENV_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_REF",
]);
const ALLOWED_MANIFEST_KEYS = new Set(["version", "project", "slots"]);
const ALLOWED_SLOT_KEYS = new Set(["slot", "email", "password"]);

export class UatBlocked extends Error {
  constructor(code, slot = null) {
    super(code);
    this.name = "UatBlocked";
    this.code = code;
    this.slot = slot;
  }
}

function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function unquote(value) {
  if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function assertRegularFile(path, { ownerOnly = false } = {}) {
  const absolute = resolve(path);
  let linkStat;
  let fileStat;
  try {
    linkStat = lstatSync(absolute);
    fileStat = statSync(absolute);
  } catch {
    throw new UatBlocked("FILE_UNAVAILABLE");
  }
  if (!linkStat.isFile() || linkStat.isSymbolicLink()) throw new UatBlocked("FILE_PATH_UNSAFE");
  if (ownerOnly && process.platform !== "win32" && (fileStat.mode & 0o077) !== 0) {
    throw new UatBlocked("FILE_PERMISSIONS_UNSAFE");
  }
  if (ownerOnly && typeof process.getuid === "function" && fileStat.uid !== process.getuid()) {
    throw new UatBlocked("FILE_OWNER_MISMATCH");
  }
  return absolute;
}

export function readAllowedEnvFile(path) {
  const absolute = assertRegularFile(path);
  let text;
  try {
    text = readFileSync(absolute, "utf8");
  } catch {
    throw new UatBlocked("ENV_FILE_UNREADABLE");
  }
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    if (!line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    if (!ALLOWED_ENV_KEYS.has(key)) continue;
    const value = unquote(line.slice(index + 1).trim());
    if (value) values[key] = value;
  }
  return values;
}

export function buildNetworkConfig(envFileValues, processEnv = process.env) {
  if (processEnv.AK_BERMET_STAFF_UAT_ENABLED !== "YES") {
    throw new UatBlocked("EXECUTION_GATE_DISABLED");
  }
  if (processEnv.AK_BERMET_STAFF_UAT_TARGET !== "DEV") {
    throw new UatBlocked("TARGET_GATE_NOT_DEV");
  }

  // An explicitly supplied env file is authoritative for connection identity.
  // This prevents unrelated/stale service environment from shadowing the DEV URL.
  const rawUrl = envFileValues.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = envFileValues.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const projectRef = envFileValues.SUPABASE_PROJECT_REF?.trim();
  if (!rawUrl) throw new UatBlocked("MISSING_ENVIRONMENT:NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) throw new UatBlocked("MISSING_ENVIRONMENT:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UatBlocked("SUPABASE_DEV_IDENTITY_MISMATCH");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== `${DEV_PROJECT_REF}.supabase.co` ||
    !["", "/"].includes(parsed.pathname) ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new UatBlocked("SUPABASE_DEV_IDENTITY_MISMATCH");
  }
  if (projectRef && projectRef !== DEV_PROJECT_REF) {
    throw new UatBlocked("SUPABASE_PROJECT_REF_MISMATCH");
  }
  return { url: DEV_BASE_URL, publishableKey };
}

function expectedEmailForSlot(slot) {
  const match = /^(owner|administrator|manager|housekeeping|technician)-(\d+)$/.exec(slot);
  if (!match) return "";
  return `${match[1]}${match[2]}@staff.akbermet.invalid`;
}

export function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UatBlocked("MANIFEST_NOT_OBJECT");
  }
  if (!exactKeys(value, ALLOWED_MANIFEST_KEYS)) throw new UatBlocked("MANIFEST_KEYS_MISMATCH");
  if (value.version !== 1 || value.project !== EXPECTED_PROJECT || !Array.isArray(value.slots)) {
    throw new UatBlocked("MANIFEST_HEADER_INVALID");
  }
  if (value.slots.length !== STAFF_SLOTS.length || STAFF_SLOTS.length !== 17) {
    throw new UatBlocked("MANIFEST_SLOT_COUNT_INVALID");
  }

  const bySlot = new Map();
  const seenEmails = new Set();
  const seenPasswords = new Set();
  for (const entry of value.slots) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !exactKeys(entry, ALLOWED_SLOT_KEYS)) {
      throw new UatBlocked("MANIFEST_SLOT_KEYS_INVALID");
    }
    const slot = typeof entry.slot === "string" ? entry.slot.trim() : "";
    const email = typeof entry.email === "string" ? entry.email.trim().toLowerCase() : "";
    const password = typeof entry.password === "string" ? entry.password : "";
    if (!STAFF_SLOTS.some((candidate) => candidate.id === slot) || bySlot.has(slot)) {
      throw new UatBlocked("MANIFEST_SLOT_INVALID", slot || null);
    }
    if (email !== expectedEmailForSlot(slot)) throw new UatBlocked("MANIFEST_EMAIL_MISMATCH", slot);
    if (password.length < 14 || password.length > 256) throw new UatBlocked("MANIFEST_PASSWORD_INVALID", slot);
    if (seenEmails.has(email)) throw new UatBlocked("MANIFEST_EMAIL_DUPLICATE", slot);
    if (seenPasswords.has(password)) throw new UatBlocked("MANIFEST_PASSWORD_DUPLICATE", slot);
    seenEmails.add(email);
    seenPasswords.add(password);
    bySlot.set(slot, { slot, email, password });
  }

  return STAFF_SLOTS.map((expected) => {
    const credential = bySlot.get(expected.id);
    if (!credential) throw new UatBlocked("MANIFEST_SLOT_MISSING", expected.id);
    return { ...credential, label: expected.label, role: expected.role };
  });
}

export function readSecureManifest(path) {
  const absolute = assertRegularFile(path, { ownerOnly: true });
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, "utf8"));
  } catch {
    throw new UatBlocked("MANIFEST_JSON_INVALID");
  }
  return validateManifest(parsed);
}

function policyBlock(sql, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`create\\s+policy\\s+${escaped}\\b[\\s\\S]*?;`, "i").exec(sql);
  if (!match) throw new UatBlocked(`RLS_POLICY_MISSING:${name}`);
  return match[0];
}

function requirePolicy(sql, name, required, forbidden = []) {
  const block = policyBlock(sql, name);
  for (const fragment of required) {
    if (!block.includes(fragment)) throw new UatBlocked(`RLS_POLICY_CONTRACT_MISMATCH:${name}`);
  }
  for (const fragment of forbidden) {
    if (block.includes(fragment)) throw new UatBlocked(`RLS_POLICY_OVERBROAD:${name}`);
  }
}

export function validateRlsContracts(repositoryRoot = process.cwd()) {
  let phase1;
  let operations;
  try {
    phase1 = readFileSync(resolve(repositoryRoot, "supabase/migrations/20260721000800_rls_policies.sql"), "utf8");
    operations = readFileSync(resolve(repositoryRoot, "supabase/migrations/20260722001700_operational_rls.sql"), "utf8");
  } catch {
    throw new UatBlocked("RLS_CONTRACT_SOURCE_UNAVAILABLE");
  }

  const managementRoles = ["public.has_role('owner')", "public.has_role('administrator')", "public.has_role('manager')"];
  requirePolicy(phase1, "customers_staff_all", managementRoles, ["public.has_role('housekeeping')", "public.has_role('technician')"]);
  requirePolicy(phase1, "bookings_staff_all", managementRoles, ["public.has_role('housekeeping')", "public.has_role('technician')"]);
  requirePolicy(phase1, "holds_staff_all", managementRoles, ["public.has_role('housekeeping')", "public.has_role('technician')"]);
  requirePolicy(phase1, "audit_log_owner_only", ["public.has_role('owner')"], ["public.has_role('administrator')", "public.has_role('manager')", "public.has_role('housekeeping')", "public.has_role('technician')"]);
  requirePolicy(phase1, "user_roles_admin_write", ["public.has_role('owner')", "public.has_role('administrator')"], ["public.has_role('manager')", "public.has_role('housekeeping')", "public.has_role('technician')"]);
  requirePolicy(operations, "cleaning_tasks_housekeeping_select", ["public.has_role('housekeeping')", "sa.staff_id = auth.uid()"], ["public.has_role('manager')"]);
  requirePolicy(operations, "maintenance_requests_technician_select", ["public.has_role('technician')", "sa.staff_id = auth.uid()"], ["public.has_role('manager')"]);
  requirePolicy(operations, "staff_assignments_self_select", ["staff_id = auth.uid()"]);
  return 8;
}

function safeRemoteCode(error) {
  const raw = error?.code ?? error?.status ?? "REMOTE_ERROR";
  return String(raw).replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

function roleNamesFromRows(rows) {
  const result = [];
  for (const row of rows ?? []) {
    const relation = row.roles;
    if (!relation) continue;
    if (Array.isArray(relation)) {
      for (const item of relation) if (item?.name) result.push(item.name);
    } else if (relation.name) {
      result.push(relation.name);
    }
  }
  return result;
}

async function verifyOneSlot(entry, config) {
  const client = createClient(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const signIn = await client.auth.signInWithPassword({ email: entry.email, password: entry.password });
  if (signIn.error || !signIn.data?.user) {
    throw new UatBlocked(`SIGN_IN_FAILED:${safeRemoteCode(signIn.error)}`, entry.slot);
  }
  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data?.user || userResult.data.user.id !== signIn.data.user.id) {
    throw new UatBlocked(`AUTH_USER_VERIFY_FAILED:${safeRemoteCode(userResult.error)}`, entry.slot);
  }
  const user = userResult.data.user;
  if (user.user_metadata?.staff_slot !== entry.slot || user.user_metadata?.full_name !== entry.label) {
    throw new UatBlocked("AUTH_METADATA_MISMATCH", entry.slot);
  }

  const [profileResult, rolesResult, staffResult] = await Promise.all([
    client.from("profiles").select("full_name,is_active,deleted_at").eq("id", user.id).maybeSingle(),
    client.from("user_roles").select("role_id,deleted_at,roles(name)").eq("user_id", user.id).is("deleted_at", null),
    client.rpc("is_staff"),
  ]);
  if (profileResult.error || !profileResult.data) throw new UatBlocked(`PROFILE_READ_FAILED:${safeRemoteCode(profileResult.error)}`, entry.slot);
  if (rolesResult.error) throw new UatBlocked(`ROLE_READ_FAILED:${safeRemoteCode(rolesResult.error)}`, entry.slot);
  if (staffResult.error || staffResult.data !== true) throw new UatBlocked(`IS_STAFF_FAILED:${safeRemoteCode(staffResult.error)}`, entry.slot);

  if (
    profileResult.data.full_name !== entry.label ||
    profileResult.data.is_active !== true ||
    profileResult.data.deleted_at !== null
  ) {
    throw new UatBlocked("PROFILE_IDENTITY_MISMATCH", entry.slot);
  }
  const roleNames = roleNamesFromRows(rolesResult.data);
  if (roleNames.length !== 1 || roleNames[0] !== entry.role) throw new UatBlocked("ROLE_IDENTITY_MISMATCH", entry.slot);

  let roleChecks = 0;
  for (const role of ROLE_NAMES) {
    const result = await client.rpc("has_role", { p_role: role });
    if (result.error) throw new UatBlocked(`ROLE_PREDICATE_FAILED:${safeRemoteCode(result.error)}`, entry.slot);
    if (result.data !== (role === entry.role)) throw new UatBlocked(`ROLE_PREDICATE_MISMATCH:${role}`, entry.slot);
    roleChecks += 1;
  }
  return roleChecks;
}

export async function executeNetworkUat(entries, config) {
  let roleChecks = 0;
  for (const entry of entries) roleChecks += await verifyOneSlot(entry, config);
  return { slots: entries.length, roleChecks };
}

export function parseArgs(argv) {
  let manifest = "";
  let envFile = "";
  let execute = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") manifest = argv[++index] ?? "";
    else if (arg === "--env-file") envFile = argv[++index] ?? "";
    else if (arg === "--execute") execute = true;
    else throw new UatBlocked("ARGUMENT_INVALID");
  }
  if (!manifest) throw new UatBlocked("MANIFEST_ARGUMENT_REQUIRED");
  if (execute && !envFile) throw new UatBlocked("ENV_FILE_ARGUMENT_REQUIRED");
  return { manifest, envFile, execute };
}

export async function main(argv = process.argv.slice(2), env = process.env, repositoryRoot = process.cwd()) {
  try {
    const args = parseArgs(argv);
    const entries = readSecureManifest(args.manifest);
    const policyChecks = validateRlsContracts(repositoryRoot);
    if (!args.execute) {
      console.log(`RESULT: PASS mode=offline slots=${entries.length} policy_checks=${policyChecks}`);
      console.log("NOTE: zero network calls; no credentials or tokens were printed.");
      return 0;
    }

    const envValues = readAllowedEnvFile(args.envFile);
    const config = buildNetworkConfig(envValues, env);
    const result = await executeNetworkUat(entries, config);
    console.log(`RESULT: PASS mode=network slots=${result.slots} role_checks=${result.roleChecks} policy_checks=${policyChecks}`);
    console.log("NOTE: read-only DEV UAT; no credentials or tokens were printed.");
    return 0;
  } catch (error) {
    const code = error instanceof UatBlocked ? error.code : "UNEXPECTED_FAILURE";
    const slot = error instanceof UatBlocked && error.slot ? ` slot=${error.slot}` : "";
    console.error(`BLOCKED: ${code}${slot}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
