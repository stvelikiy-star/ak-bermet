import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { isGoogleSheetsEnabled } from "@/lib/google-sheets";
import { getAIProviderName, isRealAIEnabled } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Безопасные статусы интеграций (без секретов).
export async function GET() {
  if (!(await isManagerAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    googleSheets: isGoogleSheetsEnabled(),
    aiProvider: getAIProviderName(),
    realAI: isRealAIEnabled(),
    freedompay: false,
    onec: false,
  });
}
