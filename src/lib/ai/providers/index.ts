import type { AIProviderInput, ChatResponse } from "@/types/chat";
import { mockProvider } from "./mock-provider";
import { openaiProvider } from "./openai-provider";

function isExplicitMockMode() {
  const runtimeEnvironment = process.env.NODE_ENV;

  return (
    (runtimeEnvironment === "development" || runtimeEnvironment === "test") &&
    process.env.AI_PROVIDER === "mock"
  );
}

export function getAIProviderName(): "mock" | "openai" {
  return isExplicitMockMode() ? "mock" : "openai";
}

export function isRealAIEnabled(): boolean {
  return (
    process.env.AI_ENABLE_REAL_CALLS === "true" &&
    process.env.AI_PROVIDER === "openai" &&
    !!process.env.OPENAI_API_KEY
  );
}

export class AIProviderUnavailableError extends Error {
  constructor() {
    super("AI provider is unavailable");
    this.name = "AIProviderUnavailableError";
  }
}

// Mock используется только при явном выборе в development/test. Ошибки и
// неполная конфигурация real-провайдера не должны превращаться в mock-ответ.
export async function generateAIResponse(
  input: AIProviderInput
): Promise<ChatResponse> {
  if (getAIProviderName() === "mock") {
    return mockProvider(input);
  }

  if (!isRealAIEnabled()) {
    throw new AIProviderUnavailableError();
  }

  try {
    return await openaiProvider(input);
  } catch {
    // Не передаём ошибку провайдера дальше: она может содержать внутренние
    // сведения запроса. Маршрут покажет пользователю безопасный handoff.
    console.error("[AI] OpenAI provider unavailable");
    throw new AIProviderUnavailableError();
  }
}
