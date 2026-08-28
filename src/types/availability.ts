// Модель доступности: Supabase — операционный источник истины; mock только для явного local dev/test режима.

export type RoomStatus = "active" | "maintenance" | "do_not_sell";

export type BookingStatus =
  | "pre_hold"
  | "waiting_prepayment"
  | "paid"
  | "confirmed"
  | "checked_in"
  | "checking_out"
  | "no_show"
  | "cancelled";

// Технические блоки относятся к occupancy, а не к бизнес-графу переходов брони.
export type OccupancyStatus = BookingStatus | "maintenance_block" | "stop_sale";

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
  status: OccupancyStatus;
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
export const BLOCKING_BOOKING_STATUSES: readonly OccupancyStatus[] = [
  "pre_hold",
  "waiting_prepayment",
  "paid",
  "confirmed",
  "checked_in",
  "checking_out",
  "maintenance_block",
  "stop_sale",
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
  | "invalid_idempotency_key"
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
