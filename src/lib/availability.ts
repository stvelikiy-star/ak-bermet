import type {
  RoomUnit,
  OccupancyRecord,
  AvailabilityQuery,
  AvailabilityItem,
} from "@/types/availability";

// TODO Stage 05: replace mock availability with Google Sheets API integration.

// Demo-данные номерного фонда (НЕ реальная доступность).
export const mockRooms: RoomUnit[] = [
  {
    id: "garden-lux-01",
    building: "Garden 1",
    floor: 1,
    category: "Garden люкс",
    bedType: "double",
    capacity: 2,
    allowsExtraBed: true,
    view: "park",
    hasWifi: true,
    repairLevel: "premium",
    distanceToSpaMeters: 120,
    distanceToBeachMeters: 250,
    status: "active",
  },
  {
    id: "lux-corp2-01",
    building: "Корпус 2",
    floor: 2,
    category: "Люкс",
    bedType: "double",
    capacity: 2,
    view: "forest",
    hasWifi: true,
    repairLevel: "new",
    distanceToSpaMeters: 60,
    distanceToBeachMeters: 250,
    status: "active",
  },
  {
    id: "lux-corp3-01",
    building: "Корпус 3",
    floor: 3,
    category: "Люкс",
    bedType: "twin",
    capacity: 2,
    view: "yard",
    hasWifi: true,
    repairLevel: "new",
    distanceToSpaMeters: 80,
    distanceToBeachMeters: 250,
    status: "active",
  },
  {
    id: "semilux-corp3-01",
    building: "Корпус 3",
    floor: 2,
    category: "Полулюкс",
    bedType: "mixed",
    capacity: 2,
    hasWifi: true,
    repairLevel: "medium",
    distanceToSpaMeters: 80,
    distanceToBeachMeters: 250,
    status: "active",
  },
  {
    id: "family4-01",
    building: "Корпус 2",
    floor: 1,
    category: "Семейный 4-местный",
    bedType: "mixed",
    capacity: 4,
    hasSofa: true,
    allowsExtraBed: true,
    hasWifi: true,
    repairLevel: "new",
    distanceToSpaMeters: 60,
    distanceToBeachMeters: 250,
    status: "active",
  },
  {
    id: "cottage8-01",
    building: "Коттедж",
    category: "Коттедж 8-местный",
    capacity: 8,
    hasWifi: false,
    repairLevel: "old",
    distanceToBeachMeters: 250,
    status: "active",
    notes: "Эконом-размещение для компаний",
  },
  {
    id: "srub7-01",
    building: "Сруб",
    category: "Сруб 7-местный",
    capacity: 7,
    hasWifi: false,
    repairLevel: "old",
    distanceToBeachMeters: 250,
    status: "active",
    notes: "Эконом-размещение для компаний",
  },
];

// Demo-занятость (пустая — реальная появится на Stage 05).
export const mockOccupancy: OccupancyRecord[] = [];

// Осторожное сообщение — нельзя обещать точное наличие.
export const AVAILABILITY_MESSAGE =
  "Предварительно могут быть варианты. Финальное наличие и бронь подтверждает администратор после проверки системы.";

// Фильтрация набора номеров по запросу (без статусов «свободно/занято»).
export function filterRooms(
  rooms: RoomUnit[],
  q: AvailabilityQuery
): AvailabilityItem[] {
  const guests = q.guests ?? 1;
  return rooms
    .filter((r) => r.status === "active")
    .filter((r) => r.capacity >= guests)
    .filter((r) =>
      q.category
        ? r.category.toLowerCase().includes(q.category.toLowerCase())
        : true
    )
    .map((r) => ({
      category: r.category,
      building: r.building,
      capacity: r.capacity,
      view: r.view,
      hasWifi: r.hasWifi,
      repairLevel: r.repairLevel,
      preliminary: true as const,
    }));
}

// Предварительный подбор по mock-данным.
export function queryAvailability(q: AvailabilityQuery): AvailabilityItem[] {
  return filterRooms(mockRooms, q);
}
