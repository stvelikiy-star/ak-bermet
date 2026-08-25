import assert from "node:assert/strict";
import test from "node:test";

import { ROOM_MASTER_V6 } from "./room-master-v6";
import {
  ROOM_MASTER_V6_CONFIRMED_TOTALS,
  ROOM_MASTER_V6_OWNER_CONFIRMED,
  confirmedMaxCapacityForRoom,
} from "./room-master-v6-confirmed";
import {
  AK_BERMET_EXTRA_CHARGES_2026,
  AK_BERMET_PRICES_2026,
  AK_BERMET_ROOM_PRICE_COVERAGE_2026,
  mapRoomToPrice2026,
  pricePeriodForDate2026,
} from "./pricing-v6";

function room(id: string) {
  const value = ROOM_MASTER_V6.find((row) => row.room_external_id === id);
  assert.ok(value, `Room ${id} must exist`);
  return value;
}

test("owner-confirmed capacity semantics reconcile the 484 maximum", () => {
  assert.equal(ROOM_MASTER_V6_OWNER_CONFIRMED.pdiMeaning.meaning, "additional_sleeping_place");
  assert.equal(ROOM_MASTER_V6_OWNER_CONFIRMED.pdiMeaning.capacityContribution, 1);
  assert.deepEqual(ROOM_MASTER_V6_CONFIRMED_TOTALS, {
    units: 169,
    official_capacity: 407,
    explicit_extra_places: 54,
    pdi_additional_places: 23,
    confirmed_max_capacity: 484,
  });
});

test("room 108 is 2 base places plus one additional place, maximum 3", () => {
  const value = room("AKB-C1-108");
  assert.equal(value.official_capacity, 3);
  assert.equal(ROOM_MASTER_V6_OWNER_CONFIRMED.room108CapacitySemantics.base_places, 2);
  assert.equal(ROOM_MASTER_V6_OWNER_CONFIRMED.room108CapacitySemantics.additional_places, 1);
  assert.equal(confirmedMaxCapacityForRoom(value), 3);
  assert.deepEqual(mapRoomToPrice2026(value), { status: "PRICED", priceKey: "c1_lux_2" });
});

test("confirmed 2026 price periods resolve without overlap", () => {
  assert.equal(pricePeriodForDate2026("2026-06-01"), "A");
  assert.equal(pricePeriodForDate2026("2026-07-02"), "A");
  assert.equal(pricePeriodForDate2026("2026-07-03"), "B");
  assert.equal(pricePeriodForDate2026("2026-08-22"), "B");
  assert.equal(pricePeriodForDate2026("2026-08-23"), "A");
  assert.equal(pricePeriodForDate2026("2026-12-25"), "A");
  assert.equal(pricePeriodForDate2026("2026-05-31"), null);
  assert.equal(pricePeriodForDate2026("2026-12-26"), null);
});

test("canonical 2026 prices match the approved primary price list", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(AK_BERMET_PRICES_2026).map(([key, value]) => [
        key,
        [value.periodA, value.periodB],
      ]),
    ),
    {
      c1_lux_4: [15600, 19100],
      c1_lux_2: [8100, 10700],
      c2_standard_2: [9500, 11600],
      c2_lux_2: [13100, 14700],
      c3_semilux_2: [10400, 12800],
      c3_lux_2: [13600, 15700],
      c3_family_4: [20800, 24400],
      garden_2: [16000, 18000],
      wood_8: [29600, 29600],
      wood_4: [17300, 17300],
      wood_2: [9600, 9600],
      brick_standard_2: [8200, 8200],
      srub_7: [32100, 32100],
    },
  );
});

test("room-price coverage fails closed for source gaps instead of inventing prices", () => {
  assert.deepEqual(AK_BERMET_ROOM_PRICE_COVERAGE_2026, {
    PRICED: 154,
    UNPRICED_PRIMARY_SOURCE: 14,
    UNRESOLVED_SOURCE_LABEL: 1,
  });

  const standardC3 = ROOM_MASTER_V6.filter(
    (row) =>
      row.raw_object_name === "Корпус №3" &&
      row.raw_source_category.startsWith("станд."),
  );
  assert.equal(standardC3.length, 14);
  assert.ok(standardC3.every((row) => mapRoomToPrice2026(row).status === "UNPRICED_PRIMARY_SOURCE"));
  assert.equal(mapRoomToPrice2026(room("AKB-C3-301")).status, "UNRESOLVED_SOURCE_LABEL");
});

test("confirmed extra charges remain canonical 2026 business rules", () => {
  assert.deepEqual(AK_BERMET_EXTRA_CHARGES_2026, {
    child_additional_accommodation_from_age_3: 1500,
    adult_additional_accommodation: 1800,
    child_additional_meals: 1440,
    adult_additional_meals: 1800,
    deduct_meals_child: 1200,
    deduct_meals_adult: 1500,
    child_main_place_discount_age_from: 3,
    child_main_place_discount_age_to_inclusive: 12,
    child_main_place_discount_percent: 20,
    under_occupancy_deduct_meals_only: true,
    parking_summer_per_day: 150,
    parking_other_seasons_per_day: 100,
    early_checkin_from: "06:00",
    early_checkin_surcharge_fraction_of_day: 0.5,
    late_checkout_until: "21:00",
    late_checkout_surcharge_fraction_of_day: 0.5,
  });
});
