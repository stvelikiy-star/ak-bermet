import assert from "node:assert/strict";
import test from "node:test";
import { STAFF_ROLE_CAPABILITIES, STAFF_SLOTS } from "./staff-role-matrix";

test("approved staff roster has exactly 17 generic numbered slots", () => {
  assert.equal(STAFF_SLOTS.length, 17);
  assert.deepEqual(
    STAFF_SLOTS.map((slot) => slot.label),
    [
      "Собственник 1",
      "Администратор 1",
      "Менеджер 1",
      "Менеджер 2",
      "Менеджер 3",
      "Менеджер 4",
      "Горничная 1",
      "Горничная 2",
      "Горничная 3",
      "Горничная 4",
      "Горничная 5",
      "Горничная 6",
      "Техник 1",
      "Техник 2",
      "Техник 3",
      "Техник 4",
      "Техник 5",
    ],
  );
});

test("housekeeping and technician stay least privilege", () => {
  assert.deepEqual(STAFF_ROLE_CAPABILITIES.housekeeping, ["cleaning_assigned"]);
  assert.deepEqual(STAFF_ROLE_CAPABILITIES.technician, ["maintenance_assigned"]);
  for (const role of ["housekeeping", "technician"] as const) {
    assert.equal(STAFF_ROLE_CAPABILITIES[role].includes("payments"), false);
    assert.equal(STAFF_ROLE_CAPABILITIES[role].includes("customers"), false);
    assert.equal(STAFF_ROLE_CAPABILITIES[role].includes("settings"), false);
  }
});

test("manager can operate booking contour without settings authority", () => {
  assert.equal(STAFF_ROLE_CAPABILITIES.manager.includes("bookings"), true);
  assert.equal(STAFF_ROLE_CAPABILITIES.manager.includes("availability"), true);
  assert.equal(STAFF_ROLE_CAPABILITIES.manager.includes("payments"), true);
  assert.equal(STAFF_ROLE_CAPABILITIES.manager.includes("settings"), false);
});
