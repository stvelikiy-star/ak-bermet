import assert from "node:assert/strict";
import test from "node:test";
import {
  technicianAuthorization,
  validateStoragePath,
  validateTechnicianAction,
  validateText,
  validateWorkLogInput,
} from "./technician-rules.ts";

test("authorization fails closed for configuration, session, activity and role", () => {
  assert.equal(technicianAuthorization(false, true, true, ["technician"]), 503);
  assert.equal(technicianAuthorization(true, false, true, ["technician"]), 401);
  assert.equal(technicianAuthorization(true, true, false, ["technician"]), 403);
  assert.equal(technicianAuthorization(true, true, true, ["housekeeping"]), 403);
  assert.equal(technicianAuthorization(true, true, true, ["technician"]), 200);
});

test("maintenance action graph follows repository RPC preconditions", () => {
  assert.equal(validateTechnicianAction("reported", "accept"), null);
  assert.equal(validateTechnicianAction("acknowledged", "start_diagnostics"), null);
  assert.equal(validateTechnicianAction("in_progress", "complete"), null);
  assert.match(validateTechnicianAction("reported", "complete") ?? "", /недоступно/);
  assert.match(validateTechnicianAction("completed", "record_work") ?? "", /недоступно/);
});

test("text and attachment paths reject invalid inputs deterministically", () => {
  assert.equal(validateText("  насос исправен  "), "насос исправен");
  assert.equal(validateText("x"), null);
  assert.equal(validateStoragePath("maintenance/id/result.jpg"), "maintenance/id/result.jpg");
  assert.equal(validateStoragePath("../secret"), null);
  assert.equal(validateStoragePath("https://example.test/photo.jpg"), null);
});

test("work and material validation maps to legal work log enum values", () => {
  assert.deepEqual(
    validateWorkLogInput("record_work", { description: "Заменён клапан" }),
    {
      logType: "work_performed",
      description: "Заменён клапан",
      materialName: null,
      quantity: null,
      unit: null,
    }
  );
  assert.equal(
    validateWorkLogInput("record_material", {
      materialName: "Клапан",
      quantity: 0,
      unit: "шт",
    }),
    null
  );
});
