import type { LeadInput, LeadInterest, LeadSource } from "@/types/lead";

const INTERESTS: LeadInterest[] = [
  "rooms",
  "garden",
  "hot_springs",
  "spa",
  "events",
  "food",
  "promo",
  "general",
];

const SOURCES: LeadSource[] = [
  "website",
  "ai_chat",
  "whatsapp",
  "phone",
  "instagram",
  "tour_agency",
  "manual",
];

export type ValidationResult = {
  ok: boolean;
  errors: Record<string, string>;
};

// Минимальная валидация заявки. Используется и на клиенте, и на сервере.
export function validateLead(input: Partial<LeadInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = "Укажите имя";
  }

  const phoneDigits = (input.phone ?? "").replace(/[^\d]/g, "");
  if (phoneDigits.length < 9) {
    errors.phone = "Укажите корректный номер телефона";
  }

  if (!input.interest || !INTERESTS.includes(input.interest)) {
    errors.interest = "Не указано направление заявки";
  }

  if (!input.source || !SOURCES.includes(input.source)) {
    errors.source = "Не указан источник заявки";
  }

  // Даты: если обе указаны — выезд должен быть позже заезда.
  if (input.checkIn && input.checkOut) {
    if (new Date(input.checkOut) <= new Date(input.checkIn)) {
      errors.checkOut = "Дата выезда должна быть позже даты заезда";
    }
  }

  if (input.adults != null && input.adults < 1) {
    errors.adults = "Минимум 1 взрослый";
  }

  if (input.guestsCount != null && input.guestsCount < 1) {
    errors.guestsCount = "Минимум 1 гость";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
