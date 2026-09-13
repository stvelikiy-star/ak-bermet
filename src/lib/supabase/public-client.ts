import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

let cachedPublicClient: SupabaseClient | null = null;

// Anonymous Data API client. The publishable key is not a secret and grants no
// RLS bypass. Use it only with policies/RPCs explicitly designed for public
// access; never substitute it for an authenticated staff client.
export function getSupabasePublicClient(): SupabaseClient {
  if (!cachedPublicClient) {
    const { url, key } = getSupabasePublicConfig();
    cachedPublicClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedPublicClient;
}
