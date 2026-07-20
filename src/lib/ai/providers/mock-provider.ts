import type { AIProviderInput, ChatResponse } from "@/types/chat";
import { generateMockAIResponse } from "../mock-ai-engine";

// Mock-провайдер: использует текущий безопасный движок.
export async function mockProvider(
  input: AIProviderInput
): Promise<ChatResponse> {
  return generateMockAIResponse({ message: input.message, page: input.page });
}
