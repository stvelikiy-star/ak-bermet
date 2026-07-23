import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Серверный клиент Supabase Auth, привязанный к cookies текущего
// запроса (Server Components, route handlers, server actions). Работает
// от имени залогиненного пользователя через publishable-ключ — все
// запросы проходят через RLS как обычно, доступа в обход RLS здесь нет
// (это НЕ Service Role клиент, см. @/lib/supabase-admin).
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Вызвано во время рендера Server Component — установка cookie
          // недоступна; актуальную сессию обновит middleware при
          // следующем запросе (см. @/lib/supabase/middleware-client).
        }
      },
    },
  });
}
