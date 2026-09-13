import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  isSupabasePublicConfigAvailable,
} from "@/lib/supabase/public-config";

// Authenticated SSR client bound to the current request cookies.
// It uses only the publishable project key, so every Data API request remains
// subject to normal RLS/RPC authorization. This is intentionally NOT a
// service-role client.
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabasePublicConfigAvailable()) return null;
  const { url, key } = getSupabasePublicConfig();
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
          // Server Components cannot always write cookies; middleware refreshes
          // the session on the next request.
        }
      },
    },
  });
}
