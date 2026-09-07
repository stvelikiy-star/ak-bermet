import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import { isSupabaseConfigured } from "@/lib/supabase-admin";
import { getOperationsData } from "@/lib/operations-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Только чтение: этот роут никогда не выполняет insert/update/delete —
// getOperationsData() (@/lib/operations-data) делает исключительно SELECT
// через серверный Supabase-клиент (Service Role ключ не покидает сервер).
export async function GET() {
  if (!(await isManagerAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "CRM-база Supabase не настроена на этом окружении.",
    });
  }

  try {
    const data = await getOperationsData();
    return NextResponse.json({ ok: true, configured: true, data });
  } catch {
    // Raw Supabase/PostgREST errors can contain internal query/schema details.
    // Keep production logs free of provider payloads and credentials.
    console.error("[MANAGER_OPERATIONS] Supabase read failed");
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: "Не удалось получить данные из Supabase. Попробуйте ещё раз.",
      },
      { status: 502 }
    );
  }
}
