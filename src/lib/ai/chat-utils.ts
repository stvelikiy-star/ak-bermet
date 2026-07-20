import type { ChatSuggestedAction } from "@/types/chat";
import { WA } from "@/data/site";
import { whatsAppToMain, createChatHandoffText } from "@/lib/whatsapp";

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
  whatsapp: (label = "Написать в WhatsApp", text?: string): ChatSuggestedAction => ({
    label,
    type: "whatsapp",
    href: text ? whatsAppToMain(text) : WA.booking,
  }),
  handoff: (question?: string): ChatSuggestedAction => ({
    label: "Перейти в WhatsApp к администратору",
    type: "whatsapp",
    href: whatsAppToMain(createChatHandoffText(question)),
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
