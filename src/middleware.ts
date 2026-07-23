import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";
import type { RoleName } from "@/types/auth";

// Роль-защищённые разделы персонала. Supabase Auth — единственный способ
// входа для всех трёх разделов. Легаси PIN-cookie (FNV-1a) удалён:
// он был offline-подбираемым (см. AK_BERMET_CODEX_AUDIT_001.md, H-03) и
// не должен использоваться как production-аутентификация.
const STAFF_AREAS: { prefix: string; roles: RoleName[] }[] = [
  { prefix: "/manager", roles: ["owner", "administrator", "manager"] },
  { prefix: "/housekeeping", roles: ["housekeeping"] },
  { prefix: "/technician", roles: ["technician"] },
];

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/staff/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

function redirectToUnauthorized(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/staff/unauthorized";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const area = STAFF_AREAS.find((a) => pathname.startsWith(a.prefix));
  if (!area) return NextResponse.next();

  // Fail closed: если Supabase Auth не настроен, доступ в защищённые
  // разделы персонала не предоставляется никому, независимо от области.
  const { supabase, response } = createSupabaseMiddlewareClient(req);
  if (!supabase) {
    return redirectToLogin(req, pathname);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectToLogin(req, pathname);
  }

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_active, deleted_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("roles ( name )")
      .eq("user_id", user.id)
      .is("deleted_at", null),
  ]);

  // Деактивированный или удалённый профиль не получает доступ ни к одной
  // защищённой странице, даже если Supabase-сессия ещё валидна.
  if (!profile || profile.is_active !== true || profile.deleted_at !== null) {
    return redirectToUnauthorized(req);
  }

  const roles = extractRoleNames(roleRows);
  const allowed = roles.some((r) => area.roles.includes(r));
  if (!allowed) {
    return redirectToUnauthorized(req);
  }

  return response;
}

interface RoleRow {
  roles: { name: RoleName } | { name: RoleName }[] | null;
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

export const config = {
  matcher: ["/manager/:path*", "/housekeeping/:path*", "/technician/:path*"],
};
