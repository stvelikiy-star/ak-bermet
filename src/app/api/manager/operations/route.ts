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
      message: "Supabase не настроен: заполните SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local",
    });
  }

  try {
    const data = await getOperationsData();
    return NextResponse.json({ ok: true, configured: true, data });
  } catch (error) {
    console.error("[MANAGER] getOperationsData failed:", error);
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
