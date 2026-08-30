import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_HEADERS = [
  "source_row_id",
  "booking_external_id",
  "ФИО гостя",
  "Телефон",
  "Дата заезда",
  "Дата выезда",
  "building_id",
  "Номер комнаты / объекта",
  "Взрослые",
  "Дети",
  "Сумма брони",
  "Оплачено",
  "Статус оплаты",
  "Статус бронирования",
  "Источник / система",
  "Утвердил",
  "Дата утверждения",
  "DQ_ID",
  "DQ_Даты",
  "DQ_Номер",
  "DQ_Суммы",
  "DQ_Дубликат",
  "DQ_Пересечение",
  "DQ_Утверждение",
  "Import_Status",
];

export const DQ_HEADERS = [
  "DQ_ID",
  "DQ_Даты",
  "DQ_Номер",
  "DQ_Суммы",
  "DQ_Дубликат",
  "DQ_Пересечение",
  "DQ_Утверждение",
];

const BOOKING_STATUS_MAP = new Map([
  ["pending_prepayment", "pending_confirmation"],
  ["pending_confirmation", "pending_confirmation"],
  ["confirmed", "confirmed"],
  ["checked_in", "checked_in"],
]);

const PAYMENT_STATUSES = new Set(["pending", "prepayment_received", "paid"]);

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return clean(value).toLowerCase();
}

function parseInteger(value) {
  const text = clean(value);
  if (!/^-?\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseMoney(value) {
  const text = clean(value)
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(/,/g, ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function formatIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDate(value) {
  const text = clean(value);
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return formatIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) return formatIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  return null;
}

function dateOrdinal(iso) {
  return Date.parse(`${iso}T00:00:00Z`);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return dateOrdinal(aStart) < dateOrdinal(bEnd) && dateOrdinal(bStart) < dateOrdinal(aEnd);
}

function normalizePaymentStatus(value) {
  return normalizeKey(value);
}

function normalizeBookingStatus(value) {
  return normalizeKey(value);
}

function normalizeDq(value) {
  return clean(value).toUpperCase();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV_UNCLOSED_QUOTE");
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function rowsFromCsv(text) {
  const matrix = parseCsv(text);
  const headerIndex = matrix.findIndex(
    (row) => row.includes("source_row_id") && row.includes("booking_external_id"),
  );
  if (headerIndex < 0) throw new Error("IMPORT_HEADER_NOT_FOUND");
  const headers = matrix[headerIndex].map(clean);
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) throw new Error(`MISSING_HEADER:${required}`);
  }
  return matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((value) => clean(value) !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function loadRows(path) {
  const text = readFileSync(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
    if (!Array.isArray(rows)) throw new Error("JSON_ROWS_ARRAY_REQUIRED");
    return rows;
  }
  return rowsFromCsv(text);
}

export function validateLegacyRows(rows) {
  const errors = [];
  const normalized = [];
  const sourceIds = new Set();
  const externalIds = new Set();
  const activeIntervals = [];

  const addError = (rowNumber, sourceRowId, code, field) => {
    errors.push({ row: rowNumber, sourceRowId: sourceRowId || null, code, field });
  };

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const sourceRowId = clean(row.source_row_id);
    const externalId = clean(row.booking_external_id);
    const guestName = clean(row["ФИО гостя"]);
    const phone = clean(row["Телефон"]);
    const checkIn = parseDate(row["Дата заезда"]);
    const checkOut = parseDate(row["Дата выезда"]);
    const buildingId = clean(row.building_id);
    const roomNumber = clean(row["Номер комнаты / объекта"]);
    const adults = parseInteger(row["Взрослые"]);
    const children = parseInteger(row["Дети"]);
    const total = parseMoney(row["Сумма брони"]);
    const paid = parseMoney(row["Оплачено"]);
    const paymentStatus = normalizePaymentStatus(row["Статус оплаты"]);
    const sourceBookingStatus = normalizeBookingStatus(row["Статус бронирования"]);
    const bookingStatus = BOOKING_STATUS_MAP.get(sourceBookingStatus) ?? null;
    const sourceSystem = clean(row["Источник / система"]);
    const approvedBy = clean(row["Утвердил"]);
    const approvedAt = parseDate(row["Дата утверждения"]);

    if (!sourceRowId) addError(rowNumber, sourceRowId, "SOURCE_ROW_ID_REQUIRED", "source_row_id");
    else if (sourceIds.has(sourceRowId)) addError(rowNumber, sourceRowId, "SOURCE_ROW_ID_DUPLICATE", "source_row_id");
    else sourceIds.add(sourceRowId);

    if (!externalId) addError(rowNumber, sourceRowId, "BOOKING_EXTERNAL_ID_REQUIRED", "booking_external_id");
    else if (externalIds.has(externalId)) addError(rowNumber, sourceRowId, "BOOKING_EXTERNAL_ID_DUPLICATE", "booking_external_id");
    else externalIds.add(externalId);

    if (guestName.length < 2) addError(rowNumber, sourceRowId, "GUEST_NAME_REQUIRED", "ФИО гостя");
    if (phone.replace(/\D/g, "").length < 9) addError(rowNumber, sourceRowId, "PHONE_INVALID", "Телефон");
    if (!checkIn) addError(rowNumber, sourceRowId, "CHECK_IN_INVALID", "Дата заезда");
    if (!checkOut) addError(rowNumber, sourceRowId, "CHECK_OUT_INVALID", "Дата выезда");
    if (checkIn && checkOut && dateOrdinal(checkOut) <= dateOrdinal(checkIn)) {
      addError(rowNumber, sourceRowId, "DATE_RANGE_INVALID", "Дата выезда");
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildingId)) {
      addError(rowNumber, sourceRowId, "BUILDING_ID_INVALID", "building_id");
    }
    if (!roomNumber) addError(rowNumber, sourceRowId, "ROOM_REQUIRED", "Номер комнаты / объекта");
    if (adults === null || adults < 1) addError(rowNumber, sourceRowId, "ADULTS_INVALID", "Взрослые");
    if (children === null || children < 0) addError(rowNumber, sourceRowId, "CHILDREN_INVALID", "Дети");
    if (total === null || total <= 0) addError(rowNumber, sourceRowId, "TOTAL_INVALID", "Сумма брони");
    if (paid === null || paid < 0) addError(rowNumber, sourceRowId, "PAID_INVALID", "Оплачено");
    if (total !== null && paid !== null && paid > total) addError(rowNumber, sourceRowId, "OVERPAYMENT_REQUIRES_RECONCILIATION", "Оплачено");

    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      addError(rowNumber, sourceRowId, "PAYMENT_STATUS_NOT_CUTOVER_SAFE", "Статус оплаты");
    } else if (paid !== null && total !== null) {
      if (paymentStatus === "pending" && paid !== 0) addError(rowNumber, sourceRowId, "PENDING_PAYMENT_MUST_BE_ZERO", "Оплачено");
      if (paymentStatus === "prepayment_received" && !(paid > 0 && paid < total)) addError(rowNumber, sourceRowId, "PREPAYMENT_AMOUNT_INCONSISTENT", "Оплачено");
      if (paymentStatus === "paid" && paid !== total) addError(rowNumber, sourceRowId, "PAID_STATUS_REQUIRES_FULL_AMOUNT", "Оплачено");
    }

    if (!bookingStatus) addError(rowNumber, sourceRowId, "BOOKING_STATUS_NOT_CUTOVER_SAFE", "Статус бронирования");
    if (!sourceSystem) addError(rowNumber, sourceRowId, "SOURCE_SYSTEM_REQUIRED", "Источник / система");
    if (!approvedBy) addError(rowNumber, sourceRowId, "APPROVER_REQUIRED", "Утвердил");
    if (!approvedAt) addError(rowNumber, sourceRowId, "APPROVAL_DATE_INVALID", "Дата утверждения");

    for (const header of DQ_HEADERS) {
      if (normalizeDq(row[header]) !== "PASS") addError(rowNumber, sourceRowId, "DQ_NOT_PASS", header);
    }
    if (normalizeDq(row.Import_Status) !== "READY") addError(rowNumber, sourceRowId, "IMPORT_STATUS_NOT_READY", "Import_Status");

    if (buildingId && roomNumber && checkIn && checkOut && bookingStatus) {
      const roomKey = `${buildingId.toLowerCase()}::${roomNumber.toLowerCase()}`;
      for (const existing of activeIntervals) {
        if (existing.roomKey === roomKey && overlaps(checkIn, checkOut, existing.checkIn, existing.checkOut)) {
          addError(rowNumber, sourceRowId, "IN_FILE_ROOM_OVERLAP", "DQ_Пересечение");
          break;
        }
      }
      activeIntervals.push({ roomKey, checkIn, checkOut, sourceRowId });
    }

    normalized.push({
      sourceRowId,
      bookingExternalId: externalId,
      guestName,
      phone,
      checkIn,
      checkOut,
      buildingId,
      roomNumber,
      adults,
      children,
      childrenAges: clean(row["Возраст детей"]) || null,
      totalAmountKgs: total,
      paidAmountKgs: paid,
      paymentStatus,
      bookingStatus,
      sourceSystem,
      approvedBy,
      approvedAt,
      responsible: clean(row["Ответственный"]) || null,
      notes: clean(row["Примечание"]) || null,
      prepaymentRequiredKgs: total === null ? null : Math.round(total * 20) / 100,
    });
  });

  return {
    ok: errors.length === 0,
    summary: {
      rows: rows.length,
      validRows: rows.length - new Set(errors.map((error) => error.row)).size,
      invalidRows: new Set(errors.map((error) => error.row)).size,
      errors: errors.length,
    },
    errors,
    normalized,
  };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/legacy-bookings-import-validator.mjs <export.csv|rows.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const result = validateLegacyRows(loadRows(path));
    const publicResult = { ok: result.ok, summary: result.summary, errors: result.errors };
    console.log(JSON.stringify(publicResult, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "IMPORT_VALIDATION_FAILED");
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
