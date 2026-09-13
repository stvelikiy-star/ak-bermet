import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { loadManagerLeads } from "@/lib/manager-leads-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isManagerAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  try {
    const items = await loadManagerLeads();
    return NextResponse.json({ ok: true, configured: true, items, source: "supabase" });
  } catch {
    console.error("[MANAGER_LEADS] Supabase read failed");
    return NextResponse.json(
      { ok: false, configured: true, message: "Не удалось загрузить заявки. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
