#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const fileArgIndex = args.indexOf("--config-file");
const envFile = resolve(
  root,
  fileArgIndex >= 0 && args[fileArgIndex + 1] ? args[fileArgIndex + 1] : ".env.local",
);

const failures = [];
const pass = (message) => console.log(`PASS: ${message}`);
const fail = (message) => failures.push(message);

function parseEnvFile(path) {
  const values = {};
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

if (!existsSync(envFile)) {
  fail(".env.local is missing; copy .env.example to .env.local before local staff QA");
} else {
  const fileValues = parseEnvFile(envFile);
  const values = {
    ...fileValues,
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => typeof value === "string"),
    ),
  };

  const url = values.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) {
    fail("NEXT_PUBLIC_SUPABASE_URL is missing");
  } else {
    try {
      const parsed = new URL(url);
      const remoteSupabase = parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
      const localSupabase =
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (!remoteSupabase && !localSupabase) {
        fail("NEXT_PUBLIC_SUPABASE_URL is not a recognized Supabase project/local URL");
      }
    } catch {
      fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
    }
  }

  if (!publishableKey) {
    fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing");
  } else if (
    publishableKey === "changeme" ||
    publishableKey === "replace-me" ||
    publishableKey.includes("<") ||
    publishableKey.length < 20
  ) {
    fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY still looks like a placeholder");
  }

  if (failures.length === 0) {
    pass("local Supabase staff-auth public environment is configured");
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`BLOCKED: ${message}`);
  process.exitCode = 2;
} else {
  console.log("RESULT: PASS");
  console.log("NOTE: this preflight is local-only and performs no network calls or database writes.");
}
