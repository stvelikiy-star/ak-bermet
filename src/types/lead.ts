// Модель заявки (lead). Используется формами, API и будущей CRM.

export type LeadSource =
  | "website"
  | "ai_chat"
  | "whatsapp"
  | "phone"
  | "instagram"
  | "tour_agency"
  | "manual";

export type LeadInterest =
  | "rooms"
  | "garden"
  | "hot_springs"
  | "spa"
  | "events"
  | "food"
  | "promo"
  | "general";

export type LeadStatus =
  | "new"
  | "in_progress"
  | "waiting_admin"
  | "waiting_prepayment"
  | "prepaid"
  | "confirmed"
  | "cancelled"
  | "lost";

export interface Lead {
  id: string;
  createdAt: string;
  source: LeadSource;
  interest: LeadInterest;
  status: LeadStatus;

  name: string;
  phone: string;

  // Проживание
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  childrenAges?: string;

  roomCategory?: string;
  wantsDoubleBed?: boolean;
  needsExtraBed?: boolean;
  needsWifi?: boolean;
  needsLowerFloor?: boolean;

  // Мероприятия
  eventType?: string;
  guestsCount?: number;
  hallSize?: string;

  // SPA / источники
  spaService?: string;

  message?: string;
  preferredContact?: "whatsapp" | "phone";
}

// То, что приходит из формы (без серверных полей id/createdAt/status).
export type LeadInput = Omit<Lead, "id" | "createdAt" | "status">;
