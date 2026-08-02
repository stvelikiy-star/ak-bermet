import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { isGoogleSheetsEnabled, getLeadsFromSheet } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isManagerAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  if (isGoogleSheetsEnabled()) {
    try {
      const items = await getLeadsFromSheet();
      return NextResponse.json({ ok: true, items, source: "sheets" });
    } catch (error) {
      console.error("[MANAGER] getLeadsFromSheet failed:", error);
      return NextResponse.json(
        { ok: false, message: "Не удалось загрузить заявки. Попробуйте ещё раз." },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { ok: false, configured: false, message: "Источник заявок не настроен." },
    { status: 503 }
  );
}
