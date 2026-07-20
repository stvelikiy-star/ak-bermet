// Типы AI-чата (архитектура Stage 06).

export type ChatRole = "user" | "assistant" | "system";

export type ChatTopic =
  | "rooms"
  | "garden"
  | "hot_springs"
  | "spa"
  | "events"
  | "food"
  | "booking"
  | "payment"
  | "cancellation"
  | "contacts"
  | "promos"
  | "legal"
  | "general"
  | "handoff";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  page?: string;
}

export interface ChatSuggestedAction {
  label: string;
  type: "link" | "whatsapp" | "lead_form" | "page";
  href?: string;
  payload?: Record<string, unknown>;
}

export interface ChatResponse {
  ok: boolean;
  message: string;
  topic?: ChatTopic;
  suggestedActions?: ChatSuggestedAction[];
  shouldHandoff?: boolean;
}

// Вход для AI-провайдера (Stage 07).
export interface AIProviderInput {
  message: string;
  history?: ChatMessage[];
  page?: string;
}
