import type {
  RoomUnit,
  OccupancyRecord,
  AvailabilityQuery,
  AvailabilityItem,
  CreateHoldRequest,
  AvailabilityErrorCode,
} from "@/types/availability";
import {
  HOLD_DURATION_MINUTES,
  BLOCKING_BOOKING_STATUSES,
} from "@/types/availability";

// Mock inventory is a local development/test aid only. Non-mock availability is loaded from authoritative Supabase server-side.

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

export class AvailabilityError extends Error {
  code: AvailabilityErrorCode;
  constructor(code: AvailabilityErrorCode, message: string) {
    super(message);
    this.name = "AvailabilityError";
    this.code = code;
  }
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Строгий разбор даты в формате YYYY-MM-DD. Отклоняет невалидные даты,
// в т.ч. "переливающиеся" (напр. 2026-02-30 -> Invalid Date проверкой ниже).
export function parseDateStrict(value: string): Date | null {
  if (!DATE_ONLY_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

// Проверяет и разбирает пару дат заезда/выезда. Бросает AvailabilityError
// с явным кодом при некорректном формате или диапазоне.
export function parseDateRange(
  checkIn?: string,
  checkOut?: string
): { checkIn: Date; checkOut: Date } | null {
  if (!checkIn && !checkOut) return null;
  if (!checkIn || !checkOut) {
    throw new AvailabilityError(
      "invalid_date_range",
      "Нужно указать обе даты: заезд и выезд."
    );
  }
  const inDate = parseDateStrict(checkIn);
  const outDate = parseDateStrict(checkOut);
  if (!inDate) {
    throw new AvailabilityError(
      "invalid_date",
      `Некорректная дата заезда: ${checkIn}`
    );
  }
  if (!outDate) {
    throw new AvailabilityError(
      "invalid_date",
      `Некорректная дата выезда: ${checkOut}`
    );
  }
  if (outDate.getTime() <= inDate.getTime()) {
    throw new AvailabilityError(
      "invalid_date_range",
      "Дата выезда должна быть позже даты заезда."
    );
  }
  return { checkIn: inDate, checkOut: outDate };
}

// Проверяет количество гостей: положительное целое число.
export function parseGuests(guestsRaw: string | null): number | undefined {
  if (guestsRaw === null || guestsRaw === "") return undefined;
  const n = Number(guestsRaw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new AvailabilityError(
      "invalid_guests",
      `Некорректное число гостей: ${guestsRaw}`
    );
  }
  return n;
}

// Пересечение двух полуоткрытых интервалов [checkIn, checkOut).
function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

// Удержание/бронь считается активной (блокирующей), если её статус не
// финализирован как отменённый и — для pre_hold — она ещё не истекла.
export function isOccupancyBlocking(
  record: OccupancyRecord,
  now: Date = new Date()
): boolean {
  if (!BLOCKING_BOOKING_STATUSES.includes(record.status)) return false;
  if (record.status === "pre_hold" && record.expiresAt) {
    const expiresAt = new Date(record.expiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
      return false;
    }
  }
  return true;
}

function roomHasConflict(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  occupancy: OccupancyRecord[],
  now: Date
): boolean {
  return occupancy.some((rec) => {
    if (rec.roomId !== roomId) return false;
    if (!isOccupancyBlocking(rec, now)) return false;
    // Только строгий разбор YYYY-MM-DD: permissive-парсинг через `new
    // Date(string)` принимает форматы вроде "01/13/2026", которые не
    // являются YYYY-MM-DD и могут дать неверную дату вместо явного отказа.
    const recIn = parseDateStrict(rec.checkIn);
    const recOut = parseDateStrict(rec.checkOut);
    if (!recIn || !recOut || recOut.getTime() <= recIn.getTime()) {
      // Повреждённые или инвертированные даты занятости не доказывают
      // отсутствие пересечения — считаем номер занятым (fail closed), а не
      // свободным. Иначе битая запись могла бы маскировать реально занятый
      // номер под доступный.
      console.error(
        `[AVAILABILITY] Malformed occupancy dates for room ${roomId}, record ${rec.id}: checkIn=${rec.checkIn} checkOut=${rec.checkOut}. Treating as conflict.`
      );
      return true;
    }
    return rangesOverlap(checkIn, checkOut, recIn, recOut);
  });
}

// Фильтрация набора номеров по запросу (без статусов «свободно/занято»).
// Если переданы даты заезда/выезда, номера с пересекающейся активной
// занятостью (включая неистёкшие удержания) исключаются из выдачи.
export function filterRooms(
  rooms: RoomUnit[],
  q: AvailabilityQuery,
  occupancy: OccupancyRecord[] = [],
  now: Date = new Date()
): AvailabilityItem[] {
  const guests = q.guests ?? 1;
  const range = parseDateRange(q.checkIn, q.checkOut);
  return rooms
    .filter((r) => r.status === "active")
    .filter((r) => r.capacity >= guests)
    .filter((r) =>
      q.category
        ? r.category.toLowerCase().includes(q.category.toLowerCase())
        : true
    )
    .filter((r) =>
      range
        ? !roomHasConflict(r.id, range.checkIn, range.checkOut, occupancy, now)
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
  return filterRooms(mockRooms, q, mockOccupancy);
}

// ── Удержания номеров (60 минут, см. DECISIONS.md) ──────────────
//
// In-memory хранилище живёт в пределах одного процесса Node.js. Этого
// достаточно для demo/mock-режима (без Google Sheets/Supabase): доступ к
// нему всегда синхронный, поэтому проверка конфликта и запись удержания
// выполняются атомарно относительно параллельных запросов в этом процессе.
const holdStore = new Map<string, OccupancyRecord>();
interface HoldIdempotencyEntry {
  hold: OccupancyRecord;
  retainUntil: number;
}

// История ключей отделена от набора активных удержаний. Она ограничена как
// сроком, так и количеством записей, чтобы клиентские ключи не позволяли
// бесконечно накапливать память. После истечения hold персональные поля из
// истории удаляются, но повтор запроса в пределах retry-window остаётся
// идемпотентным.
const HOLD_IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_HOLD_IDEMPOTENCY_ENTRIES = 10_000;
const holdIdempotencyStore = new Map<string, HoldIdempotencyEntry>();

let holdSequence = 0;
function nextHoldId(): string {
  holdSequence += 1;
  return `hold_${Date.now().toString(36)}_${holdSequence}`;
}

export function listActiveHolds(now: Date = new Date()): OccupancyRecord[] {
  return Array.from(holdStore.values()).filter((rec) =>
    isOccupancyBlocking(rec, now)
  );
}

// Убирает истёкшие удержания из хранилища (housekeeping для памяти).
export function sweepExpiredHolds(now: Date = new Date()): void {
  for (const [id, rec] of holdStore) {
    if (!isOccupancyBlocking(rec, now)) {
      holdStore.delete(id);
      if (rec.idempotencyKey) {
        const entry = holdIdempotencyStore.get(rec.idempotencyKey);
        if (entry?.hold.id === rec.id) {
          entry.hold = {
            id: rec.id,
            roomId: rec.roomId,
            checkIn: rec.checkIn,
            checkOut: rec.checkOut,
            status: rec.status,
            createdAt: rec.createdAt,
            expiresAt: rec.expiresAt,
            idempotencyKey: rec.idempotencyKey,
          };
        }
      }
    }
  }
  for (const [key, entry] of holdIdempotencyStore) {
    if (entry.retainUntil <= now.getTime()) holdIdempotencyStore.delete(key);
  }
}

export function resetHoldStoreForTests(): void {
  holdStore.clear();
  holdIdempotencyStore.clear();
  holdSequence = 0;
}

// Находит уже созданное удержание по ключу идемпотентности в пределах
// ограниченного окна повторов — независимо от того, истекло ли само hold.
function findHoldByIdempotencyKey(key: string): OccupancyRecord | undefined {
  return holdIdempotencyStore.get(key)?.hold;
}

function rememberIdempotentHold(
  key: string,
  hold: OccupancyRecord,
  expiresAt: number
): void {
  holdIdempotencyStore.set(key, {
    hold,
    retainUntil: expiresAt + HOLD_IDEMPOTENCY_RETENTION_MS,
  });
}

// Атомарно создаёт 60-минутное удержание номера, если нет конфликта по
// датам с уже действующей занятостью (внешней и текущими удержаниями).
// Повторный вызов с тем же idempotencyKey (напр. повтор запроса после
// таймаута) возвращает исходное удержание вместо создания дубликата или
// ложного конфликта с самим собой.
export function createHold(
  input: CreateHoldRequest,
  rooms: RoomUnit[],
  externalOccupancy: OccupancyRecord[] = [],
  now: Date = new Date()
): OccupancyRecord {
  const idempotencyKey = input.idempotencyKey?.trim();
  sweepExpiredHolds(now);
  if (idempotencyKey) {
    const existing = findHoldByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (
        existing.roomId !== input.roomId ||
        existing.checkIn !== input.checkIn ||
        existing.checkOut !== input.checkOut
      ) {
        throw new AvailabilityError(
          "idempotency_conflict",
          "Ключ идемпотентности уже использован для другого запроса."
        );
      }
      return existing;
    }
    if (holdIdempotencyStore.size >= MAX_HOLD_IDEMPOTENCY_ENTRIES) {
      throw new AvailabilityError(
        "availability_unknown",
        "Невозможно безопасно создать удержание. Повторите запрос позже."
      );
    }
  }

  const range = parseDateRange(input.checkIn, input.checkOut);
  if (!range) {
    throw new AvailabilityError(
      "invalid_date_range",
      "Нужно указать даты заезда и выезда."
    );
  }

  const room = rooms.find((r) => r.id === input.roomId);
  if (!room || room.status !== "active") {
    throw new AvailabilityError(
      "invalid_room",
      "Номер не найден или недоступен."
    );
  }

  const allOccupancy = [...externalOccupancy, ...holdStore.values()];
  if (roomHasConflict(room.id, range.checkIn, range.checkOut, allOccupancy, now)) {
    throw new AvailabilityError(
      "hold_conflict",
      "Номер уже удержан или забронирован на выбранные даты."
    );
  }

  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + HOLD_DURATION_MINUTES * 60_000
  ).toISOString();

  const hold: OccupancyRecord = {
    id: nextHoldId(),
    roomId: room.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    status: "pre_hold",
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    manager: input.manager,
    createdAt,
    expiresAt,
    idempotencyKey,
  };

  // Проверка конфликта и запись ниже не разделены await — весь метод
  // выполняется синхронно в одном tick event loop, поэтому параллельные
  // вызовы createHold не могут создать двойное бронирование одного номера.
  holdStore.set(hold.id, hold);
  if (idempotencyKey) {
    rememberIdempotentHold(idempotencyKey, hold, new Date(expiresAt).getTime());
  }
  return hold;
}
