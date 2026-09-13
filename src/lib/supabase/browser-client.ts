import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  isSupabasePublicConfigAvailable,
} from "@/lib/supabase/public-config";

// Browser Supabase Auth client. It uses only the publishable project key.
// Authorization always comes from RLS/RPC policies, never from this public key.
export function isSupabaseAuthConfigured(): boolean {
  return isSupabasePublicConfigAvailable();
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabasePublicConfigAvailable()) return null;
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
