import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Обмен кода на сессию для ссылок из писем Supabase Auth (сброс пароля,
// приглашение, подтверждение email) — стандартный PKCE callback.
// Пароль/логин сотрудника не проходит через этот роут напрямую
// (signInWithPassword выполняется в браузере, см. /staff/login).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/manager";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/staff/login?error=auth_callback_failed`);
}
