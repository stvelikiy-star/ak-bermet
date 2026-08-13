import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MIRROR_CONFIG,
  buildMirrorPatch,
  columnLetter,
  extractRoomExternalId,
  parseDateRange,
} from "./sheets-sync-worker.mjs";

const workerPath = resolve(import.meta.dirname, "sheets-sync-worker.mjs");
const source = readFileSync(workerPath, "utf8");

test("mirror allowlist uses dedicated Supabase UUID columns and never appends inventory", () => {
  assert.deepEqual(Object.keys(MIRROR_CONFIG).sort(), [
    "availability_holds",
    "booking_rooms",
    "bookings",
    "buildings",
    "cleaning_tasks",
    "customers",
    "maintenance_requests",
    "room_inspections",
    "room_units",
  ]);

  assert.equal(MIRROR_CONFIG.buildings.sheet, "Корпуса");
  assert.equal(MIRROR_CONFIG.buildings.idColumn, "M");
  assert.equal(MIRROR_CONFIG.buildings.idIndex, 12);
  assert.equal(MIRROR_CONFIG.buildings.allowAppend, false);

  assert.equal(MIRROR_CONFIG.room_units.sheet, "Номера");
  assert.equal(MIRROR_CONFIG.room_units.idColumn, "B");
  assert.equal(MIRROR_CONFIG.room_units.idIndex, 1);
  assert.equal(MIRROR_CONFIG.room_units.allowAppend, false);

  for (const [table, config] of Object.entries(MIRROR_CONFIG)) {
    assert.ok(config.idColumn, `${table} must have a dedicated UUID lookup column`);
    assert.ok(Number.isInteger(config.idIndex), `${table} must have a UUID column index`);
  }
});

test("Room Master source identity and daterange parsing are deterministic", () => {
  assert.equal(
    extractRoomExternalId(
      "V6_SOURCE_ID=AKB-C3-301; OWNER_CONFIRMED 2026-08-10",
      "fallback",
    ),
    "AKB-C3-301",
  );
  assert.equal(extractRoomExternalId("no source", "fallback"), "fallback");
  assert.deepEqual(parseDateRange("[2026-08-13,2026-08-15)"), {
    checkIn: "2026-08-13",
    checkOut: "2026-08-15",
  });
  assert.throws(() => parseDateRange("bad"), /INVALID_DATE_RANGE/);
});

test("column conversion supports UUID anchors beyond Z", () => {
  assert.equal(columnLetter(0), "A");
  assert.equal(columnLetter(1), "B");
  assert.equal(columnLetter(12), "M");
  assert.equal(columnLetter(25), "Z");
  assert.equal(columnLetter(26), "AA");
});

test("room mirror updates only DB-owned operational cells and preserves owner/source columns", async () => {
  const patch = await buildMirrorPatch("room_units", {
    id: "room-uuid",
    room_number: "101",
    official_beds: 2,
    extra_places: 1,
    max_capacity: 3,
    sellable_status: "blocked",
    operational_status: "ready",
    deleted_at: null,
  });

  assert.deepEqual(patch, {
    1: "room-uuid",
    4: "101",
    6: 2,
    7: 1,
    8: 3,
    11: "blocked",
    12: "ready",
    14: null,
  });
  for (const protectedIndex of [0, 2, 3, 5, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]) {
    assert.equal(Object.hasOwn(patch, protectedIndex), false, `protected room column ${protectedIndex}`);
  }
});

test("dynamic rows always include their Supabase UUID anchor", async () => {
  const lookup = async (kind) => `${kind}-value`;
  const fixtures = {
    customers: { id: "c", created_at: "now", updated_at: "now" },
    bookings: { id: "b", booking_number: "BK-1", created_at: "now", updated_at: "now" },
    booking_rooms: {
      id: "br",
      booking_id: "b",
      room_unit_id: "r",
      created_at: "now",
      updated_at: "now",
    },
    availability_holds: {
      id: "h",
      room_unit_id: "r",
      date_range: "[2026-08-13,2026-08-14)",
      created_at: "now",
      updated_at: "now",
    },
    cleaning_tasks: { id: "cl", room_unit_id: "r", created_at: "now", updated_at: "now" },
    maintenance_requests: { id: "m", room_unit_id: "r", created_at: "now", updated_at: "now" },
    room_inspections: { id: "i", room_unit_id: "r", created_at: "now" },
  };

  for (const [table, row] of Object.entries(fixtures)) {
    const patch = await buildMirrorPatch(table, row, lookup);
    assert.equal(patch[MIRROR_CONFIG[table].idIndex], row.id, `${table} UUID anchor`);
  }
});

test("relationship fields are resolved without overwriting unrelated business columns", async () => {
  const seen = [];
  const patch = await buildMirrorPatch(
    "booking_rooms",
    {
      id: "br-id",
      booking_id: "booking-id",
      room_unit_id: "room-id",
      check_in: "2026-08-13",
      check_out: "2026-08-14",
      adults: 2,
      children: 0,
      status: "confirmed",
      created_at: "created",
      updated_at: "updated",
    },
    async (kind, id) => {
      seen.push([kind, id]);
      return `${kind}:${id}`;
    },
  );

  assert.deepEqual(seen, [
    ["booking_external", "booking-id"],
    ["room_external", "room-id"],
  ]);
  assert.equal(patch[2], "booking_external:booking-id");
  assert.equal(patch[3], "room_external:room-id");
  assert.equal(patch[14], "SYNCED");
  assert.equal(Object.hasOwn(patch, 9), false);
  assert.equal(Object.hasOwn(patch, 10), false);
  assert.equal(Object.hasOwn(patch, 11), false);
});

test("execute mode fails closed before credential loading unless explicitly enabled", () => {
  const sentinel = "DO_NOT_PRINT_WORKER_SECRET";
  const result = spawnSync(process.execPath, [workerPath, "--execute"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      GOOGLE_SHEETS_ENABLED: "true",
      AK_BERMET_SHEETS_MIRROR_ENABLED: "NO",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: sentinel,
      SUPABASE_SERVICE_ROLE_KEY: sentinel,
    },
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /BLOCKED: MIRROR_EXECUTION_NOT_APPROVED/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sentinel));
});

test("worker source has no reverse Sheets-to-Supabase write contract", () => {
  assert.doesNotMatch(source, /sheets_to_supabase/);
  assert.doesNotMatch(source, /\.from\([^)]*\)\.\s*(insert|update|upsert|delete)\s*\(/);
  assert.match(source, /fn_claim_sheets_sync_batch/);
  assert.match(source, /fn_finish_sheets_sync/);
  assert.match(source, /MIRROR_EXECUTION_NOT_APPROVED/);
  assert.match(source, /SYNC_MAPPING_REQUIRED/);
});
