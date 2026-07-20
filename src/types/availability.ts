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
}

// Параметры предварительной проверки наличия
export interface AvailabilityQuery {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  category?: string;
}

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
