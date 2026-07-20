import type {
  AIProviderInput,
  ChatResponse,
  ChatTopic,
} from "@/types/chat";
import { buildSystemPrompt } from "../system-prompt";

// OpenAI-провайдер. Только server-side. Ключ берётся из env.
const MAX_HISTORY = 8;

const VALID_TOPICS: ChatTopic[] = [
  "rooms",
  "garden",
  "hot_springs",
  "spa",
  "events",
  "food",
  "booking",
  "payment",
  "cancellation",
  "contacts",
  "promos",
  "general",
  "handoff",
];

export async function openaiProvider(
  input: AIProviderInput
): Promise<ChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const history = (input.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    temperature: Number(process.env.AI_TEMPERATURE ?? "0.2"),
    max_tokens: Number(process.env.AI_MAX_TOKENS ?? "700"),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      ...history,
      { role: "user", content: input.message },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";

  // Пытаемся распарсить structured JSON. Если не вышло — оборачиваем текст.
  try {
    const parsed = JSON.parse(raw) as {
      message?: string;
      topic?: string;
      shouldHandoff?: boolean;
    };
    if (parsed.message) {
      const topic = (VALID_TOPICS.includes(parsed.topic as ChatTopic)
        ? parsed.topic
        : "general") as ChatTopic;
      return {
        ok: true,
        message: parsed.message,
        topic,
        shouldHandoff: Boolean(parsed.shouldHandoff),
      };
    }
  } catch {
    // не JSON — используем как обычный текст
  }

  return {
    ok: true,
    message: raw || "Уточню детали у администратора.",
    topic: "general",
    shouldHandoff: false,
  };
}
