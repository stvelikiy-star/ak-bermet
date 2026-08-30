import assert from "node:assert/strict";
import test from "node:test";
import {
  DQ_HEADERS,
  parseDate,
  rowsFromCsv,
  validateLegacyRows,
} from "./legacy-bookings-import-validator.mjs";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function validRow(overrides = {}) {
  const row = {
    source_row_id: "legacy-1",
    booking_external_id: "LEGACY-BOOKING-1",
    "ФИО гостя": "Тестовый Гость",
    "Телефон": "+996 700 000 000",
    "Дата заезда": "2026-09-01",
    "Дата выезда": "2026-09-05",
    building_id: BUILDING_ID,
    "Номер комнаты / объекта": "101",
    "Взрослые": "2",
    "Дети": "1",
    "Возраст детей": "7",
    "Сумма брони": "20 000",
    "Оплачено": "4 000",
    "Статус оплаты": "prepayment_received",
    "Статус бронирования": "confirmed",
    "Источник / система": "legacy-qloapps",
    "Ответственный": "manager-1",
    "Утвердил": "admin-1",
    "Дата утверждения": "30.08.2026",
    "Примечание": "verified export",
    Import_Status: "READY",
  };
  for (const header of DQ_HEADERS) row[header] = "PASS";
  return { ...row, ...overrides };
}

test("date parser accepts ISO and workbook dates but rejects impossible dates", () => {
  assert.equal(parseDate("2026-09-01"), "2026-09-01");
  assert.equal(parseDate("01.09.2026"), "2026-09-01");
  assert.equal(parseDate("31.02.2026"), null);
});

test("valid approved current booking passes and is normalized for DB staging", () => {
  const result = validateLegacyRows([validRow()]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, { rows: 1, validRows: 1, invalidRows: 0, errors: 0 });
  assert.equal(result.normalized[0].bookingStatus, "confirmed");
  assert.equal(result.normalized[0].totalAmountKgs, 20000);
  assert.equal(result.normalized[0].paidAmountKgs, 4000);
  assert.equal(result.normalized[0].prepaymentRequiredKgs, 4000);
});

test("pending prepayment maps only to pending_confirmation", () => {
  const result = validateLegacyRows([
    validRow({
      "Статус бронирования": "pending_prepayment",
      "Статус оплаты": "pending",
      "Оплачено": "0",
    }),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.normalized[0].bookingStatus, "pending_confirmation");
});

test("every DQ gate and Import_Status is mandatory", () => {
  const result = validateLegacyRows([
    validRow({ DQ_Пересечение: "BLOCKED", Import_Status: "PENDING" }),
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "DQ_NOT_PASS" && error.field === "DQ_Пересечение"));
  assert.ok(result.errors.some((error) => error.code === "IMPORT_STATUS_NOT_READY"));
});

test("duplicate external ids and overlapping room periods fail closed", () => {
  const result = validateLegacyRows([
    validRow(),
    validRow({
      source_row_id: "legacy-2",
      booking_external_id: "LEGACY-BOOKING-1",
      "Дата заезда": "2026-09-04",
      "Дата выезда": "2026-09-07",
    }),
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "BOOKING_EXTERNAL_ID_DUPLICATE"));
  assert.ok(result.errors.some((error) => error.code === "IN_FILE_ROOM_OVERLAP"));
});

test("unsafe historical statuses are rejected instead of guessed", () => {
  const result = validateLegacyRows([
    validRow({
      "Статус бронирования": "completed",
      "Статус оплаты": "under_review",
    }),
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "BOOKING_STATUS_NOT_CUTOVER_SAFE"));
  assert.ok(result.errors.some((error) => error.code === "PAYMENT_STATUS_NOT_CUTOVER_SAFE"));
});

test("payment amount must agree with payment status", () => {
  const pendingWithMoney = validateLegacyRows([
    validRow({ "Статус оплаты": "pending", "Оплачено": "100" }),
  ]);
  assert.ok(pendingWithMoney.errors.some((error) => error.code === "PENDING_PAYMENT_MUST_BE_ZERO"));

  const paidPartially = validateLegacyRows([
    validRow({ "Статус оплаты": "paid", "Оплачено": "19999" }),
  ]);
  assert.ok(paidPartially.errors.some((error) => error.code === "PAID_STATUS_REQUIRES_FULL_AMOUNT"));

  const overpayment = validateLegacyRows([
    validRow({ "Оплачено": "21000" }),
  ]);
  assert.ok(overpayment.errors.some((error) => error.code === "OVERPAYMENT_REQUIRES_RECONCILIATION"));
});

test("CSV reader finds the real header after the staging banner", () => {
  const headers = [
    "source_row_id","booking_external_id","ФИО гостя","Телефон","Дата заезда","Дата выезда","building_id","Номер комнаты / объекта","Взрослые","Дети","Возраст детей","Сумма брони","Оплачено","Статус оплаты","Статус бронирования","Источник / система","Ответственный","Утвердил","Дата утверждения","Примечание","DQ_ID","DQ_Даты","DQ_Номер","DQ_Суммы","DQ_Дубликат","DQ_Пересечение","DQ_Утверждение","Import_Status"
  ];
  const row = validRow();
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    '"STAGING ONLY — import blocked until reconciliation"',
    headers.map(escape).join(","),
    headers.map((header) => escape(row[header] ?? "")).join(","),
  ].join("\n");
  const rows = rowsFromCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].booking_external_id, "LEGACY-BOOKING-1");
  assert.equal(rows[0]["ФИО гостя"], "Тестовый Гость");
});
