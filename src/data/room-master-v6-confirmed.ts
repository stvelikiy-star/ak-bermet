import { ROOM_MASTER_V6 } from "./room-master-v6";

export const ROOM_MASTER_V6_OWNER_CONFIRMATION_DATE = "2026-08-10" as const;

export const ROOM_MASTER_V6_OWNER_CONFIRMED = {
  pdiMeaning: {
    status: "OWNER_CONFIRMED",
    meaning: "additional_sleeping_place",
    capacityContribution: 1,
    note: "Owner confirmed that raw `п.ди` means one additional sleeping place (+1).",
  },
  room108CapacitySemantics: {
    status: "OWNER_CONFIRMED",
    room_external_id: "AKB-C1-108",
    official_capacity: 3,
    base_places: 2,
    additional_places: 1,
    note: "Owner confirmed commercial semantics: 2 base places + 1 additional place.",
  },
} as const;

export function confirmedAdditionalCapacityForRoom(
  row: (typeof ROOM_MASTER_V6)[number],
): number {
  const pdiAdditional = row.raw_pdi_marker === 1 ? 1 : 0;

  if (row.room_external_id === "AKB-C1-108") {
    return 1;
  }

  return row.confirmed_explicit_extra_places + pdiAdditional;
}

export function confirmedMaxCapacityForRoom(
  row: (typeof ROOM_MASTER_V6)[number],
): number {
  if (row.room_external_id === "AKB-C1-108") {
    return 3;
  }

  return row.official_capacity + confirmedAdditionalCapacityForRoom(row);
}

export const ROOM_MASTER_V6_CONFIRMED_TOTALS = {
  units: ROOM_MASTER_V6.length,
  official_capacity: ROOM_MASTER_V6.reduce(
    (total, row) => total + row.official_capacity,
    0,
  ),
  explicit_extra_places: ROOM_MASTER_V6.reduce(
    (total, row) => total + row.confirmed_explicit_extra_places,
    0,
  ),
  pdi_additional_places: ROOM_MASTER_V6.filter(
    (row) => row.raw_pdi_marker === 1,
  ).length,
  confirmed_max_capacity: ROOM_MASTER_V6.reduce(
    (total, row) => total + confirmedMaxCapacityForRoom(row),
    0,
  ),
} as const;
