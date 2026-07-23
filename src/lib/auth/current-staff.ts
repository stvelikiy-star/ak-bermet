import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { CurrentStaff, RoleName } from "@/types/auth";

interface RoleRow {
  roles: { name: RoleName } | { name: RoleName }[] | null;
}

// Только чтение: читает auth.getUser() (валидирует токен у Auth-сервера,
// а не просто доверяет cookie) + собственные profiles/user_roles строки
// текущего пользователя — оба доступны через self-select RLS-политики
// (profiles_self_select, user_roles_self_select, см.
// supabase/migrations/20260721000800_rls_policies.sql), поэтому Service
// Role ключ здесь не нужен и не используется.
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, is_active")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("roles ( name )")
      .eq("user_id", user.id)
      .is("deleted_at", null),
  ]);

  // Деактивированный сотрудник (is_active=false) не считается текущим
  // персоналом, даже если Supabase-сессия у него всё ещё валидна.
  if (profile && profile.is_active === false) return null;

  const roles = extractRoleNames(roleRows as RoleRow[] | null);

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: (profile?.full_name as string | undefined) ?? null,
    roles,
  };
}

function extractRoleNames(rows: RoleRow[] | null): RoleName[] {
  const names: RoleName[] = [];
  for (const row of rows ?? []) {
    const rel = row.roles;
    if (!rel) continue;
    if (Array.isArray(rel)) {
      for (const r of rel) if (r?.name) names.push(r.name);
    } else if (rel.name) {
      names.push(rel.name);
    }
  }
  return names;
}

export function hasAnyRole(
  staff: CurrentStaff | null,
  allowed: RoleName[]
): boolean {
  if (!staff) return false;
  return staff.roles.some((r) => allowed.includes(r));
}
