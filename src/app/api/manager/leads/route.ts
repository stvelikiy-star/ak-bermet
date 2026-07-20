import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { isGoogleSheetsEnabled, getLeadsFromSheet } from "@/lib/google-sheets";
import { mockLeads } from "@/data/manager-mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isManagerAuthenticated()) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  if (isGoogleSheetsEnabled()) {
    try {
      const items = await getLeadsFromSheet();
      return NextResponse.json({ ok: true, items, source: "sheets" });
    } catch (error) {
      console.error("[MANAGER] getLeadsFromSheet failed, using mock:", error);
      return NextResponse.json({ ok: true, items: mockLeads, source: "mock" });
    }
  }

  return NextResponse.json({ ok: true, items: mockLeads, source: "mock" });
}
