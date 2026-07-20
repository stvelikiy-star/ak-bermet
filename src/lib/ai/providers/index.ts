import type { AIProviderInput, ChatResponse } from "@/types/chat";
import { mockProvider } from "./mock-provider";
import { openaiProvider } from "./openai-provider";

export function getAIProviderName(): "mock" | "openai" {
  return process.env.AI_PROVIDER === "openai" ? "openai" : "mock";
}

export function isRealAIEnabled(): boolean {
  return (
    process.env.AI_ENABLE_REAL_CALLS === "true" &&
    getAIProviderName() === "openai" &&
    !!process.env.OPENAI_API_KEY
  );
}

// Единая точка получения ответа. При любой ошибке real-провайдера —
// тихий fallback в mock, чтобы чат не ломался.
export async function generateAIResponse(
  input: AIProviderInput
): Promise<ChatResponse> {
  if (!isRealAIEnabled()) {
    return mockProvider(input);
  }
  try {
    return await openaiProvider(input);
  } catch (error) {
    console.error("[AI] OpenAI provider failed, falling back to mock:", error);
    return mockProvider(input);
  }
}
