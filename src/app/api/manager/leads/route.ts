import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { isSupabaseConfigured } from "@/lib/supabase-admin";
import { loadManagerLeads } from "@/lib/manager-leads-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isManagerAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, message: "CRM-база не настроена." },
      { status: 503 },
    );
  }

  try {
    const items = await loadManagerLeads();
    return NextResponse.json({ ok: true, configured: true, items, source: "supabase" });
  } catch {
    // Never serialize or log raw database errors: PostgREST/Supabase errors may
    // contain internal schema/query details. The operator gets a stable code.
    console.error("[MANAGER_LEADS] Supabase read failed");
    return NextResponse.json(
      { ok: false, configured: true, message: "Не удалось загрузить заявки. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
