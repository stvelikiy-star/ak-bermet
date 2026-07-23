import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Серверный клиент Supabase (Operational CRM, только чтение).
// ВАЖНО: использует Service Role ключ — импортировать этот модуль
// можно только из серверного кода (route handlers), никогда из
// клиентских компонентов ("use client"). Ключ даёт доступ в обход RLS,
// поэтому все вызывающие функции обязаны сами делать только SELECT.

type SupabaseEnv = { url: string; serviceRoleKey: string };

function getSupabaseEnv(): SupabaseEnv | null {
  // URL не секрет (используется и в браузерном клиенте), поэтому общий с
  // NEXT_PUBLIC_SUPABASE_URL — секретность обеспечивает только ключ ниже.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase credentials are not configured");
  }
  if (!cachedClient) {
    cachedClient = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}
