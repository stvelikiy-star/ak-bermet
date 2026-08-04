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
  const requestedNext = searchParams.get("next");
  // Redirect only to an absolute path on this origin. In particular, reject
  // protocol-relative paths and backslashes, which URL parsers may interpret
  // as an external host after a successful authentication callback.
  const next =
    requestedNext?.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : "/manager";

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
