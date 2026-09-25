import type { ChatSuggestedAction } from "@/types/chat";
import { waFor } from "@/data/site";
import { whatsAppToMain, createChatHandoffText } from "@/lib/whatsapp";
import type { Locale } from "@/i18n/locale";

export function createChatMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").trim();
}

// Есть ли в тексте хотя бы одно из ключевых слов.
export function matchesAny(text: string, keywords: string[]): boolean {
  const t = normalize(text);
  return keywords.some((k) => t.includes(normalize(k)));
}

// Готовые suggested actions.
export const actions = {
  whatsapp: (
    label = "Написать в WhatsApp",
    text?: string,
    locale: Locale = "ru"
  ): ChatSuggestedAction => ({
    label,
    type: "whatsapp",
    href: text ? whatsAppToMain(text) : waFor("booking", locale),
  }),
  handoff: (
    question?: string,
    locale: Locale = "ru",
    label = "Перейти в WhatsApp к администратору"
  ): ChatSuggestedAction => ({
    label,
    type: "whatsapp",
    href: whatsAppToMain(createChatHandoffText(question, locale)),
  }),
  page: (label: string, href: string): ChatSuggestedAction => ({
    label,
    type: "page",
    href,
  }),
  leadForm: (label: string, href: string): ChatSuggestedAction => ({
    label,
    type: "lead_form",
    href,
  }),
  link: (label: string, href: string): ChatSuggestedAction => ({
    label,
    type: "link",
    href,
  }),
};
