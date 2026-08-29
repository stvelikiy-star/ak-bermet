#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export class SheetsSyncWorkerError extends Error {
  constructor(code) {
    super(code);
    this.name = "SheetsSyncWorkerError";
    this.code = code;
  }
}

export const MIRROR_CONFIG = Object.freeze({
  buildings: { sheet: "Корпуса", idColumn: "M", idIndex: 12, width: 13, allowAppend: false, syncIndex: null },
  room_units: { sheet: "Номера", idColumn: "B", idIndex: 1, width: 25, allowAppend: false, syncIndex: null },
  customers: { sheet: "Клиенты", idColumn: "B", idIndex: 1, width: 20, allowAppend: true, syncIndex: 17 },
  bookings: { sheet: "Бронирования", idColumn: "B", idIndex: 1, width: 28, allowAppend: true, syncIndex: 26 },
  booking_rooms: { sheet: "05_Бронь_Номера", idColumn: "B", idIndex: 1, width: 20, allowAppend: true, syncIndex: 14 },
  availability_holds: { sheet: "06_Удержания", idColumn: "B", idIndex: 1, width: 20, allowAppend: true, syncIndex: 15 },
  cleaning_tasks: { sheet: "Уборка", idColumn: "B", idIndex: 1, width: 24, allowAppend: true, syncIndex: 22 },
  maintenance_requests: { sheet: "Ремонт", idColumn: "B", idIndex: 1, width: 26, allowAppend: true, syncIndex: 25 },
  room_inspections: { sheet: "10_Проверки", idColumn: "B", idIndex: 1, width: 20, allowAppend: true, syncIndex: 18 },
  leads: { sheet: "07_Лиды", idColumn: "B", idIndex: 1, width: 30, allowAppend: true, syncIndex: 29 },
  booking_payments: { sheet: "Оплаты", idColumn: "B", idIndex: 1, width: 21, allowAppend: true, syncIndex: 17 },
});

const yesNo = (value) => (value ? "Да" : "Нет");
const cell = (value) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) return JSON.stringify(value);
  return value;
};

export function extractRoomExternalId(notes, fallback = "") {
  const match = /(?:^|;\s*)V6_SOURCE_ID=([^;]+)/.exec(String(notes ?? ""));
  return match?.[1]?.trim() || fallback;
}

export function parseDateRange(value) {
  const match = /^\["?(\d{4}-\d{2}-\d{2})"?,"?(\d{4}-\d{2}-\d{2})"?\)$/.exec(String(value ?? ""));
  if (!match) throw new SheetsSyncWorkerError("INVALID_DATE_RANGE");
  return { checkIn: match[1], checkOut: match[2] };
}

export function columnLetter(index) {
  if (!Number.isInteger(index) || index < 0) throw new SheetsSyncWorkerError("INVALID_COLUMN_INDEX");
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function paymentNote(row) {
  const notes = String(row.notes ?? "").trim();
  const voidReason = String(row.void_reason ?? "").trim();
  if (row.status !== "void" || !voidReason) return notes;
  return [notes, `АННУЛИРОВАНО: ${voidReason}`].filter(Boolean).join(" | ");
}

export async function buildMirrorPatch(table, row, lookup = async () => "") {
  if (!row?.id) throw new SheetsSyncWorkerError("ENTITY_ID_REQUIRED");

  switch (table) {
    case "buildings":
      return { 3: row.official_unit_count, 4: row.official_bed_count, 7: yesNo(!row.deleted_at), 12: row.id };
    case "room_units":
      return { 1: row.id, 4: row.room_number, 6: row.official_beds, 7: row.extra_places, 8: row.max_capacity, 11: row.sellable_status, 12: row.operational_status, 14: row.deleted_at };
    case "customers":
      return { 0: row.id, 1: row.id, 2: row.created_at, 5: row.full_name, 6: row.phone, 8: row.email, 16: row.notes, 17: "SYNCED", 18: row.updated_at, 19: row.deleted_at };
    case "bookings":
      return { 0: row.booking_number || row.id, 1: row.id, 3: row.booking_number, 4: row.created_at, 5: row.source, 7: row.check_in, 8: row.check_out, 10: row.adults, 11: row.children, 14: row.status, 16: row.total_amount_kgs, 17: row.prepayment_required_kgs, 21: row.notes, 22: row.cancellation_reason, 23: row.cancelled_at, 26: "SYNCED", 27: row.updated_at };
    case "booking_rooms":
      return { 0: row.id, 1: row.id, 2: await lookup("booking_external", row.booking_id), 3: await lookup("room_external", row.room_unit_id), 4: row.check_in, 5: row.check_out, 6: row.status, 7: row.adults, 8: row.children, 12: row.created_at, 13: row.updated_at, 14: "SYNCED" };
    case "availability_holds": {
      const { checkIn, checkOut } = parseDateRange(row.date_range);
      return { 0: row.id, 1: row.id, 2: row.idempotency_key, 3: await lookup("room_external", row.room_unit_id), 5: checkIn, 6: checkOut, 7: row.created_at, 8: row.expires_at, 9: row.status, 12: row.held_by, 15: "SYNCED", 16: row.updated_at };
    }
    case "cleaning_tasks":
      return { 0: row.task_number || row.id, 1: row.id, 2: await lookup("room_external", row.room_unit_id), 3: await lookup("booking_external", row.booking_id), 11: row.status, 12: yesNo(Boolean(row.reported_problem)), 13: row.reported_problem, 16: yesNo(Boolean(row.requires_inspection)), 18: row.due_by, 19: row.created_by, 20: row.created_at, 21: row.updated_at, 22: "SYNCED" };
    case "maintenance_requests":
      return { 0: row.request_number || row.id, 1: row.id, 2: await lookup("room_external", row.room_unit_id), 3: await lookup("cleaning_external", row.cleaning_task_id), 5: row.priority, 6: row.description, 7: yesNo(Boolean(row.blocks_room)), 8: row.resulting_operational_status, 11: row.diagnosed_at, 12: row.started_at, 13: row.completed_at, 14: row.status, 15: row.diagnosis, 22: row.reported_by, 23: row.created_at, 24: row.updated_at, 25: "SYNCED" };
    case "room_inspections": {
      const sourceType = row.cleaning_task_id ? "cleaning_task" : row.maintenance_request_id ? "maintenance_request" : "manual";
      const sourceExternal = row.cleaning_task_id
        ? await lookup("cleaning_external", row.cleaning_task_id)
        : row.maintenance_request_id
          ? await lookup("maintenance_external", row.maintenance_request_id)
          : "";
      return { 0: row.id, 1: row.id, 2: await lookup("room_external", row.room_unit_id), 3: sourceType, 4: sourceExternal, 5: row.trigger_reason, 10: row.result, 15: row.notes, 16: row.created_at, 18: "SYNCED", 19: row.inspected_by };
    }
    case "leads":
      return { 0: row.lead_number || row.id, 1: row.id, 2: row.created_at, 3: row.source, 4: row.interest, 5: row.status, 6: row.name, 7: row.phone, 8: row.check_in, 9: row.check_out, 10: row.adults, 11: row.children, 12: row.children_ages, 13: row.room_category_id, 14: row.wants_double_bed, 15: row.needs_extra_bed, 16: row.needs_wifi, 17: row.needs_lower_floor, 18: row.event_type, 19: row.guests_count, 20: row.hall_size, 21: row.spa_service, 22: row.message, 23: row.preferred_contact, 24: row.assigned_manager_id, 25: row.manager_comment, 26: row.booking_id, 27: row.updated_at, 28: row.deleted_at, 29: "SYNCED" };
    case "booking_payments":
      return {
        0: row.id,
        1: row.id,
        2: await lookup("booking_external", row.booking_id),
        3: row.paid_at,
        4: row.method,
        5: row.amount_kgs,
        6: row.currency || "KGS",
        7: row.status === "confirmed" ? row.amount_kgs : 0,
        8: row.status,
        9: row.receipt_url,
        10: yesNo(row.status === "confirmed"),
        11: row.confirmed_by,
        12: row.confirmed_at,
        13: row.balance_after_kgs,
        14: "",
        15: "",
        16: paymentNote(row),
        17: "SYNCED",
        18: row.updated_at,
        19: row.deleted_at,
        20: "PASS",
      };
    default:
      throw new SheetsSyncWorkerError("UNSUPPORTED_ENTITY_TABLE");
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new SheetsSyncWorkerError(`MISSING_ENV:${name}`);
  return value;
}

export function validateMode(mode) {
  if (!["dry-run", "execute"].includes(mode)) throw new SheetsSyncWorkerError("INVALID_MODE");
  if (process.env.GOOGLE_SHEETS_ENABLED !== "true") throw new SheetsSyncWorkerError("GOOGLE_SHEETS_DISABLED");
  if (mode === "execute" && process.env.AK_BERMET_SHEETS_MIRROR_ENABLED !== "YES") throw new SheetsSyncWorkerError("MIRROR_EXECUTION_NOT_APPROVED");
}

async function makeClients() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const spreadsheetId = requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  const email = requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key = requiredEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const sheets = google.sheets({ version: "v4", auth });
  return { supabase, sheets, spreadsheetId };
}

async function loadEntity(supabase, table, id) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new SheetsSyncWorkerError("SUPABASE_ENTITY_READ_FAILED");
  return data ?? null;
}

async function lookupRelation(supabase, kind, id) {
  if (!id) return "";
  const contracts = {
    room_external: ["room_units", "id, notes, room_number"],
    booking_external: ["bookings", "id, booking_number"],
    cleaning_external: ["cleaning_tasks", "id, task_number"],
    maintenance_external: ["maintenance_requests", "id, request_number"],
  };
  const contract = contracts[kind];
  if (!contract) throw new SheetsSyncWorkerError("UNSUPPORTED_RELATION_LOOKUP");
  const [table, select] = contract;
  const { data, error } = await supabase.from(table).select(select).eq("id", id).maybeSingle();
  if (error) throw new SheetsSyncWorkerError("SUPABASE_RELATION_READ_FAILED");
  if (!data) return String(id);
  if (kind === "room_external") return extractRoomExternalId(data.notes, data.room_number || String(id));
  if (kind === "booking_external") return data.booking_number || String(id);
  if (kind === "cleaning_external") return data.task_number || String(id);
  return data.request_number || String(id);
}

function quotedSheet(name) {
  return `'${String(name).replaceAll("'", "''")}'`;
}

async function findSheetRow(sheets, spreadsheetId, config, entityId) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${quotedSheet(config.sheet)}!${config.idColumn}2:${config.idColumn}`, valueRenderOption: "UNFORMATTED_VALUE" });
  const values = response.data.values ?? [];
  const index = values.findIndex((row) => String(row?.[0] ?? "") === String(entityId));
  return index < 0 ? null : index + 2;
}

async function updatePatch(sheets, spreadsheetId, config, rowNumber, patch) {
  const data = Object.entries(patch)
    .map(([rawIndex, value]) => [Number(rawIndex), value])
    .filter(([index]) => Number.isInteger(index) && index >= 0 && index < config.width)
    .map(([index, value]) => ({ range: `${quotedSheet(config.sheet)}!${columnLetter(index)}${rowNumber}`, values: [[cell(value)]] }));
  if (data.length === 0) throw new SheetsSyncWorkerError("EMPTY_SHEET_PATCH");
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data } });
}

async function appendPatch(sheets, spreadsheetId, config, patch) {
  const row = Array(config.width).fill("");
  for (const [rawIndex, value] of Object.entries(patch)) {
    const index = Number(rawIndex);
    if (Number.isInteger(index) && index >= 0 && index < config.width) row[index] = cell(value);
  }
  if (String(row[config.idIndex] ?? "") === "") throw new SheetsSyncWorkerError("APPEND_UUID_ANCHOR_MISSING");
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${quotedSheet(config.sheet)}!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [row] } });
}

async function markMissingDynamicRow(sheets, spreadsheetId, config, rowNumber) {
  if (config.syncIndex === null) throw new SheetsSyncWorkerError("AUTHORITATIVE_INVENTORY_ROW_MISSING");
  await updatePatch(sheets, spreadsheetId, config, rowNumber, { [config.syncIndex]: "DELETED_IN_SUPABASE" });
}

async function inspectItem(clients, item) {
  const config = MIRROR_CONFIG[item.entity_table];
  if (!config) throw new SheetsSyncWorkerError("UNSUPPORTED_ENTITY_TABLE");
  if (item.target_sheet !== config.sheet) throw new SheetsSyncWorkerError("QUEUE_TARGET_MISMATCH");
  const entity = await loadEntity(clients.supabase, item.entity_table, item.entity_id);
  const rowNumber = await findSheetRow(clients.sheets, clients.spreadsheetId, config, item.entity_id);
  if (!entity) {
    if (!config.allowAppend) throw new SheetsSyncWorkerError("AUTHORITATIVE_INVENTORY_ROW_MISSING");
    return { config, entity: null, rowNumber, action: rowNumber ? "mark_deleted" : "no_op" };
  }
  if (rowNumber) return { config, entity, rowNumber, action: "update" };
  if (!config.allowAppend) throw new SheetsSyncWorkerError("SYNC_MAPPING_REQUIRED");
  return { config, entity, rowNumber: null, action: "append" };
}

async function processItem(clients, item) {
  const inspected = await inspectItem(clients, item);
  const { config, entity, rowNumber, action } = inspected;
  if (action === "no_op") return action;
  if (action === "mark_deleted") {
    await markMissingDynamicRow(clients.sheets, clients.spreadsheetId, config, rowNumber);
    return action;
  }
  const patch = await buildMirrorPatch(item.entity_table, entity, (kind, id) => lookupRelation(clients.supabase, kind, id));
  if (action === "update") await updatePatch(clients.sheets, clients.spreadsheetId, config, rowNumber, patch);
  else await appendPatch(clients.sheets, clients.spreadsheetId, config, patch);
  return action;
}

function safeErrorCode(error) {
  return error instanceof SheetsSyncWorkerError ? error.code : "SHEETS_SYNC_WORKER_ERROR";
}

async function finishItem(supabase, item, success, errorCode = null, action = null) {
  const { error } = await supabase.rpc("fn_finish_sheets_sync", { p_queue_id: item.id, p_success: success, p_error: errorCode, p_detail: { worker: "node", action }, p_max_attempts: 5 });
  if (error) throw new SheetsSyncWorkerError("QUEUE_FINISH_FAILED");
}

async function runDry(clients, limit) {
  const { data, error } = await clients.supabase
    .from("sheets_sync_queue")
    .select("id, entity_table, entity_id, target_sheet, direction, status")
    .eq("direction", "supabase_to_sheets")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new SheetsSyncWorkerError("QUEUE_READ_FAILED");

  let failures = 0;
  for (const item of data ?? []) {
    try {
      const inspected = await inspectItem(clients, item);
      console.log(`DRY: ${item.entity_table} -> ${inspected.action}`);
    } catch (error) {
      failures += 1;
      console.error(`DRY_BLOCKED: ${item.entity_table} -> ${safeErrorCode(error)}`);
    }
  }
  console.log(`RESULT: ${failures === 0 ? "PASS" : "BLOCKED"} queue=${data?.length ?? 0}`);
  if (failures > 0) process.exitCode = 2;
}

async function runExecute(clients, limit) {
  const { data, error } = await clients.supabase.rpc("fn_claim_sheets_sync_batch", { p_limit: limit });
  if (error) throw new SheetsSyncWorkerError("QUEUE_CLAIM_FAILED");

  let failures = 0;
  for (const item of data ?? []) {
    try {
      const action = await processItem(clients, item);
      await finishItem(clients.supabase, item, true, null, action);
      console.log(`SYNCED: ${item.entity_table} -> ${action}`);
    } catch (error) {
      failures += 1;
      const code = safeErrorCode(error);
      try {
        await finishItem(clients.supabase, item, false, code, "failed");
      } catch {
        console.error(`SYNC_BLOCKED: ${item.entity_table} -> QUEUE_FINISH_FAILED`);
        throw new SheetsSyncWorkerError("QUEUE_FINISH_FAILED");
      }
      console.error(`SYNC_BLOCKED: ${item.entity_table} -> ${code}`);
    }
  }
  console.log(`RESULT: ${failures === 0 ? "PASS" : "PARTIAL"} claimed=${data?.length ?? 0}`);
  if (failures > 0) process.exitCode = 2;
}

function parseArgs(argv) {
  const mode = argv.includes("--execute") ? "execute" : "dry-run";
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=", 2)[1]) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new SheetsSyncWorkerError("INVALID_LIMIT");
  return { mode, limit };
}

export async function main(argv = process.argv.slice(2)) {
  const { mode, limit } = parseArgs(argv);
  validateMode(mode);
  const clients = await makeClients();
  if (mode === "execute") await runExecute(clients, limit);
  else await runDry(clients, limit);
}

const invokedDirectly = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url : false;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`BLOCKED: ${safeErrorCode(error)}`);
    process.exitCode = 2;
  });
}
