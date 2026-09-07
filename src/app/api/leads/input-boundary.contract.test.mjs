import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../../../lib/lead-schema.ts", import.meta.url), "utf8");

test("public lead validation rejects malformed runtime types and oversized text", () => {
  assert.match(schema, /typeof input\.name !== "string"/);
  assert.match(schema, /typeof input\.phone !== "string"/);
  assert.match(schema, /MAX_NAME = 120/);
  assert.match(schema, /MAX_PHONE = 40/);
  assert.match(schema, /MAX_MESSAGE = 4000/);
  assert.match(schema, /validateOptionalString\(errors, "message", input\.message, MAX_MESSAGE\)/);
  assert.match(schema, /validateOptionalBoolean/);
  assert.match(schema, /Number\.isInteger\(value\)/);
});

test("public lead validation requires real YYYY-MM-DD calendar dates", () => {
  assert.match(schema, /function validDateOnly/);
  assert.match(schema, /Date\.UTC/);
  assert.match(schema, /date\.getUTCFullYear\(\) === year/);
  assert.match(schema, /!validDateOnly\(input\.checkIn\)/);
  assert.match(schema, /!validDateOnly\(input\.checkOut\)/);
  assert.match(schema, /input\.checkOut <= input\.checkIn/);
});
