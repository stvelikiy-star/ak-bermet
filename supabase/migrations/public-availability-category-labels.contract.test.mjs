import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const migration = readFileSync(
  resolve(import.meta.dirname, "20260913112000_public_availability_category_labels.sql"),
  "utf8",
);
const searchUi = readFileSync(
  resolve(root, "src/components/availability/PublicAvailabilitySearch.tsx"),
  "utf8",
);

test("public category labels normalize the approved V6 staging names", () => {
  for (const label of [
    "Garden Rooms",
    "Стандарт",
    "Люкс",
    "Полулюкс",
    "Семейный 4-местный",
    "Коттеджи и срубы",
    "Корпус №1 — 2-местный",
    "Корпус №1 — 3-местный",
    "Корпус №1 — 4-местный",
  ]) {
    assert.ok(migration.includes(`'${label}'`), `missing canonical label: ${label}`);
  }

  for (const raw of [
    "люкс (две)",
    "люкс (одна)",
    "п/люкс. 1 кровать",
    "п/люкс. 2 кровати",
    "станд. 1 кровать",
    "станд. 2 кровати",
    "4-х семейный-3",
    "две 2",
    "одна 1",
  ]) {
    assert.ok(migration.includes(`'${raw}'`), `missing V6 mapping input: ${raw}`);
  }
});

test("availability filter uses canonical exact matching and keeps legacy aliases", () => {
  assert.match(migration, /lower\(public\.fn_public_room_category_label\(b\.name, rc\.name\)\)\s*=/);
  assert.doesNotMatch(migration, /lower\(rc\.name\)\s+like/);
  for (const alias of ["garden", "семейный", "коттедж", "сруб"]) {
    assert.ok(migration.includes(`when '${alias}'`), `missing compatibility alias: ${alias}`);
  }
  assert.match(migration, /or lower\(rc\.name\) = lower\(btrim\(p_category\)\)/);
});

test("guest portal also receives canonical category labels", () => {
  const guestFnStart = migration.indexOf("create or replace function public.fn_public_guest_room_context");
  assert.ok(guestFnStart >= 0);
  const guestFn = migration.slice(guestFnStart);
  assert.match(guestFn, /public\.fn_public_room_category_label\(bl\.name, rc\.name\)/);
});

test("public search dropdown sends canonical category values", () => {
  for (const value of [
    "Garden Rooms",
    "Стандарт",
    "Люкс",
    "Полулюкс",
    "Семейный 4-местный",
    "Коттеджи и срубы",
  ]) {
    assert.ok(searchUi.includes(`[\"${value}\"`), `missing canonical search option: ${value}`);
  }
  assert.ok(!searchUi.includes('["Garden", "Garden"]'));
});
