import { NextResponse } from "next/server";
import { getAIProviderName, isRealAIEnabled } from "@/lib/ai/providers";

export const runtime = "nodejs";

// Безопасный статус AI (без ключей и секретов).
export async function GET() {
  return NextResponse.json({
    provider: getAIProviderName(),
    realCallsEnabled: isRealAIEnabled(),
  });
}
