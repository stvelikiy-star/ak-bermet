// Модель доступности (готовится под Stage 05 — Google Sheets / CRM).

export type RoomStatus = "active" | "maintenance" | "do_not_sell";

export type BookingStatus =
  | "pre_hold"
  | "waiting_prepayment"
  | "paid"
  | "confirmed"
  | "checked_in"
  | "checking_out"
  | "cancelled";

export interface RoomUnit {
  id: string;
  building: string;
  floor?: number;
  roomNumber?: string;
  category: string;
  bedType?: "double" | "twin" | "mixed";
  capacity: number;
  hasSofa?: boolean;
  allowsExtraBed?: boolean;
  view?: "forest" | "yard" | "park" | "other";
  hasWifi?: boolean;
  repairLevel?: "old" | "medium" | "new" | "premium";
  distanceToSpaMeters?: number;
  distanceToBeachMeters?: number;
  status: RoomStatus;
  notes?: string;
}

export interface OccupancyRecord {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  guestName?: string;
  guestPhone?: string;
  source?: string;
  manager?: string;
  notes?: string;
  // Заполняются для удержаний, создаваемых через API (Stage 05).
  createdAt?: string;
  expiresAt?: string;
  // Ключ идемпотентности запроса, создавшего это удержание (если был передан).
  idempotencyKey?: string;
}

// Длительность удержания номера (см. DECISIONS.md — 60 минут).
export const HOLD_DURATION_MINUTES = 60;

// Статусы занятости, которые блокируют номер от повторного бронирования.
export const BLOCKING_BOOKING_STATUSES: readonly BookingStatus[] = [
  "pre_hold",
  "waiting_prepayment",
  "paid",
  "confirmed",
  "checked_in",
  "checking_out",
];

// Параметры предварительной проверки наличия
export interface AvailabilityQuery {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  category?: string;
}

// Запрос на создание удержания номера
export interface CreateHoldRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestName?: string;
  guestPhone?: string;
  manager?: string;
  // Клиентский ключ повторного запроса (напр. повтор после таймаута или
  // двойной клик). Повторный вызов с тем же ключом возвращает то же
  // удержание вместо создания дубликата.
  idempotencyKey?: string;
}

export type AvailabilityErrorCode =
  | "invalid_date"
  | "invalid_date_range"
  | "invalid_guests"
  | "invalid_room"
  | "room_unavailable"
  | "hold_conflict"
  | "idempotency_conflict"
  | "availability_unknown";

// Один вариант в ответе предварительной проверки
export interface AvailabilityItem {
  category: string;
  building: string;
  capacity: number;
  view?: string;
  hasWifi?: boolean;
  repairLevel?: string;
  // Намеренно НЕ содержит "свободно/занято" — финал подтверждает администратор.
  preliminary: true;
}
