import type { ChatTopic } from "../../types/chat";
import type { LeadInput, LeadInterest } from "../../types/lead";

const TOPIC_TO_INTEREST: Record<ChatTopic, LeadInterest> = {
  rooms: "rooms",
  booking: "rooms",
  payment: "rooms",
  cancellation: "rooms",
  garden: "garden",
  hot_springs: "hot_springs",
  spa: "spa",
  events: "events",
  food: "food",
  promos: "promo",
  contacts: "general",
  legal: "general",
  general: "general",
  handoff: "general",
};

export function chatTopicToLeadInterest(topic?: ChatTopic): LeadInterest {
  return topic ? TOPIC_TO_INTEREST[topic] : "general";
}

export function buildAiChatLeadInput(input: {
  name: string;
  phone: string;
  topic?: ChatTopic;
  page?: string | null;
  lastUserMessage?: string | null;
}): LeadInput {
  const page = (input.page ?? "").trim().slice(0, 200);
  const lastUserMessage = (input.lastUserMessage ?? "").trim().slice(0, 800);
  const context = [
    "Передано из AI-чата сайта.",
    page ? `Страница: ${page}` : null,
    lastUserMessage ? `Последний запрос гостя: ${lastUserMessage}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");

  return {
    source: "ai_chat",
    interest: chatTopicToLeadInterest(input.topic),
    name: input.name.trim().slice(0, 120),
    phone: input.phone.trim().slice(0, 60),
    preferredContact: "whatsapp",
    message: context,
  };
}
