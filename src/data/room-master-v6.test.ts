import assert from "node:assert/strict";
import test from "node:test";

import {
  ROOM_MASTER_V6,
  ROOM_MASTER_V6_UNRESOLVED,
  deriveRoomMasterV6View,
} from "./room-master-v6";

const expectedObjectDistribution = {
  "Корпус №1": { rows: 24, officialCapacity: 55 },
  "Garden 1": { rows: 16, officialCapacity: 32 },
  "Garden 2": { rows: 16, officialCapacity: 32 },
  "Корпус №2": { rows: 56, officialCapacity: 112 },
  "Корпус №3": { rows: 40, officialCapacity: 100 },
  "Коттеджи кирпичные": { rows: 3, officialCapacity: 6 },
  "Коттеджи деревянные / срубы": { rows: 14, officialCapacity: 70 },
};

const expectedCategoryDistribution = {
  "4-х мест": 7,
  "две 2": 10,
  "одна 1": 9,
  "три 3": 1,
  "одна 2": 1,
  "одна": 22,
  "две": 46,
  "люкс (две)": 13,
  "люкс (одна)": 7,
  "люкс": 14,
  "4-х семейный": 9,
  "п/люкс. 1 кровать": 1,
  "п/люкс. 2 кровати": 1,
  "станд. 1 кровать": 7,
  "станд. 2 кровати": 7,
  "4-х семейный-3": 1,
  "двухместный стандарт": 3,
  "8 мест": 4,
  "2-х места": 4,
  "7 мест": 2,
};

test("room master v6 has canonical totals and unique keys", () => {
  assert.equal(ROOM_MASTER_V6.length, 169);
  assert.equal(new Set(ROOM_MASTER_V6.map((row) => row.room_external_id)).size, 169);
  assert.equal(
    new Set(
      ROOM_MASTER_V6.map(
        (row) => `${row.raw_object_name}\u0000${row.raw_room_or_object_number}`,
      ),
    ).size,
    169,
  );
  assert.equal(
    ROOM_MASTER_V6.reduce((total, row) => total + row.official_capacity, 0),
    407,
  );
  assert.equal(
    ROOM_MASTER_V6.reduce(
      (total, row) => total + row.confirmed_explicit_extra_places,
      0,
    ),
    54,
  );
  assert.equal(
    ROOM_MASTER_V6.filter((row) => row.raw_pdi_marker === 1).length,
    23,
  );
});

test("room master v6 has the exact object distribution and no corpus 4", () => {
  const actual: Record<string, { rows: number; officialCapacity: number }> = {};
  for (const row of ROOM_MASTER_V6) {
    const value = (actual[row.raw_object_name] ??= { rows: 0, officialCapacity: 0 });
    value.rows += 1;
    value.officialCapacity += row.official_capacity;
  }

  assert.deepEqual(actual, expectedObjectDistribution);
  assert.equal(ROOM_MASTER_V6.some((row) => row.raw_object_name === "Корпус №4"), false);
});

test("room master v6 has the exact raw category distribution", () => {
  const actual: Record<string, number> = {};
  for (const row of ROOM_MASTER_V6) {
    actual[row.raw_source_category] = (actual[row.raw_source_category] ?? 0) + 1;
  }
  assert.deepEqual(actual, expectedCategoryDistribution);
});

test("views derive only from entirely numeric room numbers", () => {
  assert.equal(deriveRoomMasterV6View("108"), "nature");
  assert.equal(deriveRoomMasterV6View("207"), "yard_service_construction_fence");
  assert.equal(deriveRoomMasterV6View("5А"), null);
  assert.equal(deriveRoomMasterV6View("дер2"), null);
  assert.equal(
    ROOM_MASTER_V6.filter((row) => !/^\d+$/.test(row.raw_room_or_object_number)).every(
      (row) => row.derived_view === null,
    ),
    true,
  );
});

test("unresolved primary semantics remain explicit and verbatim", () => {
  assert.equal(ROOM_MASTER_V6_UNRESOLVED.pdiMeaning.value, null);
  assert.equal(ROOM_MASTER_V6_UNRESOLVED.room108CapacitySemantics.official_capacity, 3);
  assert.equal(
    ROOM_MASTER_V6_UNRESOLVED.room108CapacitySemantics.historical_commercial_rule,
    "2 guests + adult extra bed",
  );
  assert.equal(ROOM_MASTER_V6_UNRESOLVED.room207RawLabel.raw_source_category, "одна 2");
  assert.equal(ROOM_MASTER_V6_UNRESOLVED.room301RawLabel.raw_source_category, "4-х семейный-3");
});
