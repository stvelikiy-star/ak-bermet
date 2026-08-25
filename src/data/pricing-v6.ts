import { ROOM_MASTER_V6, type RoomMasterV6Row } from "./room-master-v6";

export type PricePeriod2026 = "A" | "B";

export const AK_BERMET_PRICE_PERIODS_2026 = {
  A: [
    {
      sourceLabel: "01.06–02.07",
      startInclusive: "2026-06-01",
      endExclusive: "2026-07-03",
    },
    {
      sourceLabel: "23.08–25.12",
      startInclusive: "2026-08-23",
      endExclusive: "2026-12-26",
    },
  ],
  B: [
    {
      sourceLabel: "03.07–23.08",
      startInclusive: "2026-07-03",
      endExclusive: "2026-08-23",
    },
  ],
} as const;

export const AK_BERMET_EXTRA_CHARGES_2026 = {
  child_additional_accommodation_from_age_3: 1500,
  adult_additional_accommodation: 1800,
  child_additional_meals: 1440,
  adult_additional_meals: 1800,
  deduct_meals_child: 1200,
  deduct_meals_adult: 1500,

  // Owner-confirmed AK BERMET rule:
  // children aged 3 through 12 on a main place receive a 20% discount.
  child_main_place_discount_age_from: 3,
  child_main_place_discount_age_to_inclusive: 12,
  child_main_place_discount_percent: 20,

  // Owner-confirmed AK BERMET rule:
  // when occupancy is below the room's official places,
  // only the meal component for unused places is deducted.
  under_occupancy_deduct_meals_only: true,

  // Owner-confirmed seasonal rule. Exact summer date boundaries are not auto-derived here.
  parking_summer_per_day: 150,
  parking_other_seasons_per_day: 100,
  early_checkin_from: "06:00",
  early_checkin_surcharge_fraction_of_day: 0.5,
  late_checkout_until: "21:00",
  late_checkout_surcharge_fraction_of_day: 0.5,
} as const;

export type CanonicalPriceKey2026 =
  | "c1_lux_4"
  | "c1_lux_2"
  | "c2_standard_2"
  | "c2_lux_2"
  | "c3_semilux_2"
  | "c3_lux_2"
  | "c3_family_4"
  | "garden_2"
  | "wood_8"
  | "wood_4"
  | "wood_2"
  | "brick_standard_2"
  | "srub_7";

export interface CanonicalPrice2026 {
  readonly key: CanonicalPriceKey2026;
  readonly label: string;
  readonly object: string;
  readonly official_places: number;
  readonly periodA: number;
  readonly periodB: number;
  readonly includes_three_meals: true;
}

export const AK_BERMET_PRICES_2026: Record<CanonicalPriceKey2026, CanonicalPrice2026> = {
  c1_lux_4: {
    key: "c1_lux_4",
    label: "4-местный люкс",
    object: "Корпус №1",
    official_places: 4,
    periodA: 15600,
    periodB: 19100,
    includes_three_meals: true,
  },
  c1_lux_2: {
    key: "c1_lux_2",
    label: "2-местный люкс",
    object: "Корпус №1",
    official_places: 2,
    periodA: 8100,
    periodB: 10700,
    includes_three_meals: true,
  },
  c2_standard_2: {
    key: "c2_standard_2",
    label: "2-местный стандарт",
    object: "Корпус №2",
    official_places: 2,
    periodA: 9500,
    periodB: 11600,
    includes_three_meals: true,
  },
  c2_lux_2: {
    key: "c2_lux_2",
    label: "2-местный люкс",
    object: "Корпус №2",
    official_places: 2,
    periodA: 13100,
    periodB: 14700,
    includes_three_meals: true,
  },
  c3_semilux_2: {
    key: "c3_semilux_2",
    label: "2-местный полулюкс",
    object: "Корпус №3",
    official_places: 2,
    periodA: 10400,
    periodB: 12800,
    includes_three_meals: true,
  },
  c3_lux_2: {
    key: "c3_lux_2",
    label: "2-местный люкс",
    object: "Корпус №3",
    official_places: 2,
    periodA: 13600,
    periodB: 15700,
    includes_three_meals: true,
  },
  c3_family_4: {
    key: "c3_family_4",
    label: "4-местный семейный люкс",
    object: "Корпус №3",
    official_places: 4,
    periodA: 20800,
    periodB: 24400,
    includes_three_meals: true,
  },
  garden_2: {
    key: "garden_2",
    label: "2-местный Garden",
    object: "Garden 1 / Garden 2",
    official_places: 2,
    periodA: 16000,
    periodB: 18000,
    includes_three_meals: true,
  },
  wood_8: {
    key: "wood_8",
    label: "Деревянный коттедж 8 мест",
    object: "Коттеджи деревянные / срубы",
    official_places: 8,
    periodA: 29600,
    periodB: 29600,
    includes_three_meals: true,
  },
  wood_4: {
    key: "wood_4",
    label: "Деревянный коттедж 4 места",
    object: "Коттеджи деревянные / срубы",
    official_places: 4,
    periodA: 17300,
    periodB: 17300,
    includes_three_meals: true,
  },
  wood_2: {
    key: "wood_2",
    label: "Деревянный коттедж 2 места",
    object: "Коттеджи деревянные / срубы",
    official_places: 2,
    periodA: 9600,
    periodB: 9600,
    includes_three_meals: true,
  },
  brick_standard_2: {
    key: "brick_standard_2",
    label: "Кирпичный коттедж, 2-местный стандарт",
    object: "Коттеджи кирпичные",
    official_places: 2,
    periodA: 8200,
    periodB: 8200,
    includes_three_meals: true,
  },
  srub_7: {
    key: "srub_7",
    label: "Сруб 7 мест",
    object: "Коттеджи деревянные / срубы",
    official_places: 7,
    periodA: 32100,
    periodB: 32100,
    includes_three_meals: true,
  },
};

export type RoomPriceMapping2026 =
  | { status: "PRICED"; priceKey: CanonicalPriceKey2026 }
  | { status: "UNPRICED_PRIMARY_SOURCE"; reason: string }
  | { status: "UNRESOLVED_SOURCE_LABEL"; reason: string };

export function pricePeriodForDate2026(date: string): PricePeriod2026 | null {
  for (const range of AK_BERMET_PRICE_PERIODS_2026.A) {
    if (date >= range.startInclusive && date < range.endExclusive) return "A";
  }
  for (const range of AK_BERMET_PRICE_PERIODS_2026.B) {
    if (date >= range.startInclusive && date < range.endExclusive) return "B";
  }
  return null;
}

export function mapRoomToPrice2026(row: RoomMasterV6Row): RoomPriceMapping2026 {
  switch (row.raw_object_name) {
    case "Корпус №1":
      if (row.room_external_id === "AKB-C1-108") {
        return { status: "PRICED", priceKey: "c1_lux_2" };
      }
      if (row.official_capacity === 4) return { status: "PRICED", priceKey: "c1_lux_4" };
      if (row.official_capacity === 2) return { status: "PRICED", priceKey: "c1_lux_2" };
      return { status: "UNRESOLVED_SOURCE_LABEL", reason: `Unexpected C1 capacity: ${row.official_capacity}` };

    case "Garden 1":
    case "Garden 2":
      return { status: "PRICED", priceKey: "garden_2" };

    case "Корпус №2":
      return row.raw_source_category.startsWith("люкс")
        ? { status: "PRICED", priceKey: "c2_lux_2" }
        : { status: "PRICED", priceKey: "c2_standard_2" };

    case "Корпус №3":
      if (row.raw_source_category === "люкс") return { status: "PRICED", priceKey: "c3_lux_2" };
      if (row.raw_source_category.startsWith("п/люкс")) return { status: "PRICED", priceKey: "c3_semilux_2" };
      if (row.raw_source_category === "4-х семейный") return { status: "PRICED", priceKey: "c3_family_4" };
      if (row.raw_source_category === "4-х семейный-3") {
        return {
          status: "UNRESOLVED_SOURCE_LABEL",
          reason: "Raw source label `4-х семейный-3` is preserved pending explicit source reconciliation.",
        };
      }
      if (row.raw_source_category.startsWith("станд.")) {
        return {
          status: "UNPRICED_PRIMARY_SOURCE",
          reason: "Primary 2026 price source contains no confirmed price for Корпус №3 standard rooms.",
        };
      }
      return { status: "UNRESOLVED_SOURCE_LABEL", reason: `Unknown C3 source category: ${row.raw_source_category}` };

    case "Коттеджи кирпичные":
      return { status: "PRICED", priceKey: "brick_standard_2" };

    case "Коттеджи деревянные / срубы":
      if (row.raw_source_category === "8 мест") return { status: "PRICED", priceKey: "wood_8" };
      if (row.raw_source_category === "4-х мест") return { status: "PRICED", priceKey: "wood_4" };
      if (row.raw_source_category === "2-х места") return { status: "PRICED", priceKey: "wood_2" };
      if (row.raw_source_category === "7 мест") return { status: "PRICED", priceKey: "srub_7" };
      return { status: "UNRESOLVED_SOURCE_LABEL", reason: `Unknown cottage source category: ${row.raw_source_category}` };

    default:
      return {
        status: "UNRESOLVED_SOURCE_LABEL",
        reason: `Unknown accommodation object: ${row.raw_object_name}`,
      };
  }
}

export const AK_BERMET_ROOM_PRICE_COVERAGE_2026 = ROOM_MASTER_V6.reduce(
  (summary, row) => {
    const mapping = mapRoomToPrice2026(row);
    summary[mapping.status] += 1;
    return summary;
  },
  {
    PRICED: 0,
    UNPRICED_PRIMARY_SOURCE: 0,
    UNRESOLVED_SOURCE_LABEL: 0,
  } as Record<RoomPriceMapping2026["status"], number>,
);
