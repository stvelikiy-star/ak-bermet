import type { Lead } from "@/types/lead";
import { SITE } from "@/data/site";

// Универсальный конструктор ссылки WhatsApp.
export function createWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Вспомогательное: собрать строки без пустых значений.
function lines(rows: Array<[string, string | number | undefined | null]>): string {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && `${v}`.trim() !== "")
    .map(([label, v]) => `${label}: ${v}`)
    .join("\n");
}

export function createBookingWhatsAppText(lead: Partial<Lead>): string {
  const body = lines([
    ["Имя", lead.name],
    ["Телефон", lead.phone],
    ["Категория", lead.roomCategory],
    [
      "Даты",
      lead.checkIn || lead.checkOut
        ? `${lead.checkIn ?? "?"} — ${lead.checkOut ?? "?"}`
        : undefined,
    ],
    ["Взрослые", lead.adults],
    ["Дети", lead.children],
    ["Возраст детей", lead.childrenAges],
    ["Двуспальная кровать", lead.wantsDoubleBed ? "да" : undefined],
    ["Доп. место", lead.needsExtraBed ? "да" : undefined],
    ["Нужен Wi-Fi", lead.needsWifi ? "да" : undefined],
    ["Нижний этаж", lead.needsLowerFloor ? "да" : undefined],
    ["Пожелания", lead.message],
  ]);
  return `Здравствуйте! Хочу узнать наличие в Ак-Бермет.\n\n${body}`;
}

export function createEventWhatsAppText(lead: Partial<Lead>): string {
  const body = lines([
    ["Имя", lead.name],
    ["Телефон", lead.phone],
    ["Дата", lead.checkIn],
    ["Тип мероприятия", lead.eventType],
    ["Количество гостей", lead.guestsCount],
    ["Зал", lead.hallSize],
    ["Пожелания", lead.message],
  ]);
  return `Здравствуйте! Хотим провести мероприятие в Ак-Бермет.\n\n${body}`;
}

export function createSpaWhatsAppText(lead: Partial<Lead>): string {
  const body = lines([
    ["Имя", lead.name],
    ["Телефон", lead.phone],
    ["Интерес", lead.spaService],
    ["Дата визита", lead.checkIn],
    ["Количество гостей", lead.guestsCount],
    ["Пожелания", lead.message],
  ]);
  return `Здравствуйте! Интересует SPA / источники в Ак-Бермет.\n\n${body}`;
}

export function createGeneralWhatsAppText(lead: Partial<Lead>): string {
  const body = lines([
    ["Имя", lead.name],
    ["Телефон", lead.phone],
    ["Сообщение", lead.message],
  ]);
  return `Здравствуйте! У меня вопрос по Ак-Бермет.\n\n${body}`;
}

// Ссылка на главный номер с уже собранным текстом.
export function whatsAppToMain(text: string): string {
  return createWhatsAppUrl(SITE.phoneRaw, text);
}

// Текст для передачи диалога администратору из AI-чата.
export function createChatHandoffText(question?: string): string {
  const q = (question ?? "").trim();
  return (
    "Здравствуйте! Я общался с AI-помощником на сайте Ак-Бермет и хочу уточнить вопрос.\n\n" +
    `Мой вопрос:\n${q || "—"}`
  );
}
