#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEV_PROJECT_REF = "ednqgzgjhnalsiiuekmw";
export const DEV_HOST = `${DEV_PROJECT_REF}.supabase.co`;

export const EXPECTED_STAFF_SLOTS = Object.freeze([
  { slot: "owner-1", label: "Собственник 1", role: "owner" },
  { slot: "administrator-1", label: "Администратор 1", role: "administrator" },
  ...Array.from({ length: 4 }, (_, index) => ({ slot: `manager-${index + 1}`, label: `Менеджер ${index + 1}`, role: "manager" })),
  ...Array.from({ length: 6 }, (_, index) => ({ slot: `housekeeping-${index + 1}`, label: `Горничная ${index + 1}`, role: "housekeeping" })),
  ...Array.from({ length: 5 }, (_, index) => ({ slot: `technician-${index + 1}`, label: `Техник ${index + 1}`, role: "technician" })),
]);

const EXPECTED_ROLES = new Set(EXPECTED_STAFF_SLOTS.map((slot) => slot.role));
const ALLOWED_ENTRY_KEYS = new Set(["slot", "email", "password"]);

export class ProvisioningError extends Error {
  constructor(code, slot = null) {
    super(code);
    this.name = "ProvisioningError";
    this.code = code;
    this.slot = slot;
  }
}

function exactKeys(object, expected) {
  const keys = Object.keys(object).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProvisioningError("MANIFEST_NOT_OBJECT");
  }
  if (!exactKeys(value, new Set(["version", "project", "slots"]))) {
    throw new ProvisioningError("MANIFEST_KEYS_MISMATCH");
  }
  if (value.version !== 1 || value.project !== "ak-bermet-dev" || !Array.isArray(value.slots)) {
    throw new ProvisioningError("MANIFEST_HEADER_INVALID");
  }
  if (value.slots.length !== EXPECTED_STAFF_SLOTS.length) {
    throw new ProvisioningError("MANIFEST_SLOT_COUNT_INVALID");
  }

  const expectedBySlot = new Map(EXPECTED_STAFF_SLOTS.map((slot) => [slot.slot, slot]));
  const seenSlots = new Set();
  const seenEmails = new Set();
  const seenPasswords = new Set();
  const normalized = [];

  for (const entry of value.slots) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !exactKeys(entry, ALLOWED_ENTRY_KEYS)) {
      throw new ProvisioningError("MANIFEST_SLOT_KEYS_INVALID");
    }
    const slot = typeof entry.slot === "string" ? entry.slot.trim() : "";
    const expected = expectedBySlot.get(slot);
    if (!expected || seenSlots.has(slot)) {
      throw new ProvisioningError("MANIFEST_SLOT_INVALID", slot || null);
    }
    const email = normalizeEmail(entry.email);
    const password = typeof entry.password === "string" ? entry.password : "";
    if (!isEmail(email)) throw new ProvisioningError("MANIFEST_EMAIL_INVALID", slot);
    if (seenEmails.has(email)) throw new ProvisioningError("MANIFEST_EMAIL_DUPLICATE", slot);
    if (password.length < 14 || password.length > 256) {
      throw new ProvisioningError("MANIFEST_PASSWORD_LENGTH_INVALID", slot);
    }
    if (seenPasswords.has(password)) throw new ProvisioningError("MANIFEST_PASSWORD_DUPLICATE", slot);
    if (password.toLowerCase().includes(slot.toLowerCase()) || password.toLowerCase().includes(email.split("@")[0])) {
      throw new ProvisioningError("MANIFEST_PASSWORD_TOO_PREDICTABLE", slot);
    }
    seenSlots.add(slot);
    seenEmails.add(email);
    seenPasswords.add(password);
    normalized.push({ ...expected, email, password });
  }

  for (const expected of EXPECTED_STAFF_SLOTS) {
    if (!seenSlots.has(expected.slot)) throw new ProvisioningError("MANIFEST_SLOT_MISSING", expected.slot);
  }
  return normalized.sort((a, b) => EXPECTED_STAFF_SLOTS.findIndex((slot) => slot.slot === a.slot) - EXPECTED_STAFF_SLOTS.findIndex((slot) => slot.slot === b.slot));
}

export function validateDevEnvironment(env = process.env) {
  if (env.AK_BERMET_AUTH_PROVISION_ENABLED !== "YES") {
    throw new ProvisioningError("EXECUTION_GATE_DISABLED");
  }
  if (env.AK_BERMET_AUTH_TARGET !== "DEV") {
    throw new ProvisioningError("TARGET_GATE_NOT_DEV");
  }
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl) throw new ProvisioningError("MISSING_ENVIRONMENT:NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new ProvisioningError("MISSING_ENVIRONMENT:SUPABASE_SERVICE_ROLE_KEY");

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProvisioningError("SUPABASE_DEV_IDENTITY_MISMATCH");
  }
  if (url.protocol !== "https:" || url.hostname !== DEV_HOST || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new ProvisioningError("SUPABASE_DEV_IDENTITY_MISMATCH");
  }
  if (env.SUPABASE_PROJECT_REF?.trim() && env.SUPABASE_PROJECT_REF.trim() !== DEV_PROJECT_REF) {
    throw new ProvisioningError("SUPABASE_PROJECT_REF_MISMATCH");
  }
  return { url: `https://${DEV_HOST}`, serviceRoleKey };
}

export function readSecureManifest(path) {
  const absolute = resolve(path);
  let linkStat;
  let fileStat;
  try {
    linkStat = lstatSync(absolute);
    fileStat = statSync(absolute);
  } catch {
    throw new ProvisioningError("MANIFEST_UNAVAILABLE");
  }
  if (!linkStat.isFile() || linkStat.isSymbolicLink()) throw new ProvisioningError("MANIFEST_PATH_UNSAFE");
  if (process.platform !== "win32" && (fileStat.mode & 0o077) !== 0) {
    throw new ProvisioningError("MANIFEST_PERMISSIONS_UNSAFE");
  }
  if (typeof process.getuid === "function" && fileStat.uid !== process.getuid()) {
    throw new ProvisioningError("MANIFEST_OWNER_MISMATCH");
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, "utf8"));
  } catch {
    throw new ProvisioningError("MANIFEST_JSON_INVALID");
  }
  return validateManifest(parsed);
}

function safeRemoteCode(error) {
  const code = error?.code ?? error?.status ?? "REMOTE_ERROR";
  return String(code).replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

async function listAllAuthUsers(supabase) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new ProvisioningError(`AUTH_LIST_FAILED:${safeRemoteCode(error)}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) return users;
  }
  throw new ProvisioningError("AUTH_LIST_PAGINATION_LIMIT");
}

async function loadRoleIds(supabase) {
  const { data, error } = await supabase.from("roles").select("id,name");
  if (error || !data) throw new ProvisioningError(`ROLE_LOOKUP_FAILED:${safeRemoteCode(error)}`);
  const map = new Map(data.map((row) => [row.name, row.id]));
  if (map.size < EXPECTED_ROLES.size || [...EXPECTED_ROLES].some((role) => !map.has(role))) {
    throw new ProvisioningError("ROLE_CATALOG_MISMATCH");
  }
  return map;
}

async function verifyExistingSlot(supabase, authUser, entry, expectedRoleId) {
  if (authUser.user_metadata?.staff_slot !== entry.slot || authUser.user_metadata?.full_name !== entry.label) {
    throw new ProvisioningError("EXISTING_AUTH_METADATA_MISMATCH", entry.slot);
  }

  const [profileResult, roleResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,is_active,deleted_at").eq("id", authUser.id).maybeSingle(),
    supabase.from("user_roles").select("role_id,deleted_at").eq("user_id", authUser.id).is("deleted_at", null),
  ]);
  if (profileResult.error || roleResult.error) {
    throw new ProvisioningError("EXISTING_SLOT_READ_FAILED", entry.slot);
  }
  const profile = profileResult.data;
  const roleIds = roleResult.data?.map((row) => row.role_id) ?? [];
  if (!profile || profile.deleted_at || !profile.is_active || profile.full_name !== entry.label) {
    throw new ProvisioningError("EXISTING_PROFILE_MISMATCH", entry.slot);
  }
  if (roleIds.length !== 1 || roleIds[0] !== expectedRoleId) {
    throw new ProvisioningError("EXISTING_ROLE_MISMATCH", entry.slot);
  }
}

async function rollbackCreatedUsers(supabase, created) {
  const failures = [];
  for (const item of [...created].reverse()) {
    const { error } = await supabase.auth.admin.deleteUser(item.userId);
    if (error) failures.push(item.slot);
  }
  return failures;
}

export async function executeProvisioning(entries, env = process.env) {
  const config = validateDevEnvironment(env);
  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const roleIds = await loadRoleIds(supabase);
  const authUsers = await listAllAuthUsers(supabase);
  const usersByEmail = new Map(authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
  const created = [];
  let existingCount = 0;

  try {
    for (const entry of entries) {
      const expectedRoleId = roleIds.get(entry.role);
      const existing = usersByEmail.get(entry.email);
      if (existing) {
        await verifyExistingSlot(supabase, existing, entry, expectedRoleId);
        existingCount += 1;
        continue;
      }

      const createResult = await supabase.auth.admin.createUser({
        email: entry.email,
        password: entry.password,
        email_confirm: true,
        user_metadata: { full_name: entry.label, staff_slot: entry.slot },
      });
      if (createResult.error || !createResult.data?.user?.id) {
        throw new ProvisioningError(`AUTH_CREATE_FAILED:${safeRemoteCode(createResult.error)}`, entry.slot);
      }
      const userId = createResult.data.user.id;
      created.push({ slot: entry.slot, userId });

      const profileResult = await supabase.from("profiles").insert({ id: userId, full_name: entry.label, is_active: true });
      if (profileResult.error) {
        throw new ProvisioningError(`PROFILE_CREATE_FAILED:${safeRemoteCode(profileResult.error)}`, entry.slot);
      }
      const roleResult = await supabase.from("user_roles").insert({ user_id: userId, role_id: expectedRoleId });
      if (roleResult.error) {
        throw new ProvisioningError(`ROLE_BIND_FAILED:${safeRemoteCode(roleResult.error)}`, entry.slot);
      }
    }

    const finalUsers = await listAllAuthUsers(supabase);
    const finalByEmail = new Map(finalUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
    for (const entry of entries) {
      const authUser = finalByEmail.get(entry.email);
      if (!authUser) throw new ProvisioningError("POSTCONDITION_AUTH_USER_MISSING", entry.slot);
      await verifyExistingSlot(supabase, authUser, entry, roleIds.get(entry.role));
    }

    return { created: created.length, existing: existingCount, total: entries.length };
  } catch (error) {
    const rollbackFailures = await rollbackCreatedUsers(supabase, created);
    if (rollbackFailures.length) {
      throw new ProvisioningError(`ROLLBACK_INCOMPLETE:${rollbackFailures.join(",")}`, error?.slot ?? null);
    }
    throw error;
  }
}

function parseArgs(argv) {
  let manifest = "";
  let execute = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") execute = true;
    else if (arg === "--manifest") manifest = argv[++index] ?? "";
    else throw new ProvisioningError("ARGUMENT_INVALID");
  }
  if (!manifest) throw new ProvisioningError("MANIFEST_ARGUMENT_REQUIRED");
  return { manifest, execute };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    const args = parseArgs(argv);
    const entries = readSecureManifest(args.manifest);
    if (!args.execute) {
      console.log(`RESULT: PASS mode=dry-run slots=${entries.length}`);
      console.log("NOTE: no network calls or user/database changes were performed.");
      return 0;
    }
    const result = await executeProvisioning(entries, env);
    console.log(`RESULT: PASS mode=execute created=${result.created} existing=${result.existing} total=${result.total}`);
    console.log("NOTE: credentials and secret values were not printed.");
    return 0;
  } catch (error) {
    const code = error instanceof ProvisioningError ? error.code : "UNEXPECTED_FAILURE";
    const slot = error instanceof ProvisioningError && error.slot ? ` slot=${error.slot}` : "";
    console.error(`BLOCKED: ${code}${slot}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
