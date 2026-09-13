// Public Supabase Data API configuration for AK BERMET.
//
// The project URL and sb_publishable_* key are intentionally public values:
// they are shipped to the browser and rely on RLS/RPC authorization. They are
// NOT service-role credentials and must never be treated as an authorization
// boundary. Environment variables still take precedence so a deployment can
// override/rotate these values without a code change.

const FALLBACK_SUPABASE_URL = "https://ednqgzgjhnalsiiuekmw.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7cDXEzFLEL41Rr9FCEqQUQ_b_5mBOQK";

export function getSupabasePublicConfig(): { url: string; key: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    key:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isSupabasePublicConfigAvailable(): boolean {
  const { url, key } = getSupabasePublicConfig();
  return Boolean(url && key);
}
