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

const MAX_NAME = 120;
const MAX_PHONE = 40;
const MAX_SHORT_TEXT = 200;
const MAX_MESSAGE = 4000;
const MAX_GUESTS = 10_000;
const MAX_STAY_GUESTS = 1_000;

export type ValidationResult = {
  ok: boolean;
  errors: Record<string, string>;
};

function validDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateOptionalString(
  errors: Record<string, string>,
  field: keyof LeadInput,
  value: unknown,
  max: number,
): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || value.length > max) {
    errors[String(field)] = "Некорректное значение";
  }
}

function validateOptionalBoolean(
  errors: Record<string, string>,
  field: keyof LeadInput,
  value: unknown,
): void {
  if (value !== undefined && value !== null && typeof value !== "boolean") {
    errors[String(field)] = "Некорректное значение";
  }
}

function validateOptionalInteger(
  errors: Record<string, string>,
  field: keyof LeadInput,
  value: unknown,
  min: number,
  max: number,
): void {
  if (value === undefined || value === null) return;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    errors[String(field)] = "Некорректное количество";
  }
}

// Boundary validation is shared by client forms and the public API. The API
// receives untrusted JSON, so runtime type/size checks are mandatory even
// though LeadInput is statically typed in TypeScript.
export function validateLead(input: Partial<LeadInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 2 ||
    input.name.length > MAX_NAME
  ) {
    errors.name = "Укажите корректное имя";
  }

  const phone = typeof input.phone === "string" ? input.phone : "";
  const phoneDigits = phone.replace(/[^\d]/g, "");
  if (
    typeof input.phone !== "string" ||
    input.phone.length > MAX_PHONE ||
    phoneDigits.length < 9 ||
    phoneDigits.length > 20
  ) {
    errors.phone = "Укажите корректный номер телефона";
  }

  if (!input.interest || !INTERESTS.includes(input.interest)) {
    errors.interest = "Не указано направление заявки";
  }

  if (!input.source || !SOURCES.includes(input.source)) {
    errors.source = "Не указан источник заявки";
  }

  for (const [field, value] of [
    ["childrenAges", input.childrenAges],
    ["roomCategory", input.roomCategory],
    ["eventType", input.eventType],
    ["hallSize", input.hallSize],
    ["spaService", input.spaService],
  ] as const) {
    validateOptionalString(errors, field, value, MAX_SHORT_TEXT);
  }
  validateOptionalString(errors, "message", input.message, MAX_MESSAGE);

  if (input.checkIn !== undefined) {
    if (typeof input.checkIn !== "string" || !validDateOnly(input.checkIn)) {
      errors.checkIn = "Некорректная дата заезда";
    }
  }
  if (input.checkOut !== undefined) {
    if (typeof input.checkOut !== "string" || !validDateOnly(input.checkOut)) {
      errors.checkOut = "Некорректная дата выезда";
    }
  }

  if (
    !errors.checkIn &&
    !errors.checkOut &&
    input.checkIn &&
    input.checkOut &&
    input.checkOut <= input.checkIn
  ) {
    errors.checkOut = "Дата выезда должна быть позже даты заезда";
  }

  validateOptionalInteger(errors, "adults", input.adults, 1, MAX_STAY_GUESTS);
  validateOptionalInteger(errors, "children", input.children, 0, MAX_STAY_GUESTS);
  validateOptionalInteger(errors, "guestsCount", input.guestsCount, 1, MAX_GUESTS);

  for (const [field, value] of [
    ["wantsDoubleBed", input.wantsDoubleBed],
    ["needsExtraBed", input.needsExtraBed],
    ["needsWifi", input.needsWifi],
    ["needsLowerFloor", input.needsLowerFloor],
  ] as const) {
    validateOptionalBoolean(errors, field, value);
  }

  if (
    input.preferredContact !== undefined &&
    input.preferredContact !== "whatsapp" &&
    input.preferredContact !== "phone"
  ) {
    errors.preferredContact = "Некорректный способ связи";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
