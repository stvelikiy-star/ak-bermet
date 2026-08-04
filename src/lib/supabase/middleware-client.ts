import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Клиент Supabase Auth для middleware — обновляет access-токен по
// refresh-токену из cookie и прокидывает Set-Cookie в ответ, чтобы
// Server Components на следующем рендере видели свежую сессию.
// Возвращает supabase=null, если переменные окружения не заданы —
// вызывающий код (middleware.ts) обязан обработать это как «Supabase
// Auth недоступен», не как ошибку.
export function createSupabaseMiddlewareClient(request: NextRequest): {
  supabase: SupabaseClient | null;
  response: NextResponse;
} {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { supabase: null, response };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}
