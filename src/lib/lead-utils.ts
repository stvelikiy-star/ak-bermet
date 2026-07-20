import type { Lead, LeadInput } from "@/types/lead";

// Простой уникальный id заявки (без внешних зависимостей).
export function createLeadId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `lead_${ts}_${rnd}`;
}

// Нормализация телефона к виду цифр (для tel/WhatsApp).
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

// Маппинг интереса в человекочитаемую подпись.
export const interestLabels: Record<string, string> = {
  rooms: "Номера и коттеджи",
  garden: "Garden Rooms",
  hot_springs: "Горячие источники",
  spa: "SPA",
  events: "Мероприятия",
  food: "Питание",
  promo: "Акция",
  general: "Общий вопрос",
};

// Сборка полного объекта Lead из данных формы (на сервере).
export function buildLead(input: LeadInput): Lead {
  return {
    ...input,
    id: createLeadId(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
}
