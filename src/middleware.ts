import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "@/lib/manager-auth";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";
import type { RoleName } from "@/types/auth";

// Роль-защищённые разделы персонала. /manager дополнительно принимает
// легаси PIN-cookie (временный резервный вход, см. .env.example) —
// /housekeeping и /technician новые и входа по PIN не имеют.
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Легаси-страница PIN-входа всегда публична, независимо от области.
  if (pathname.startsWith("/manager/login")) {
    return NextResponse.next();
  }

  const area = STAFF_AREAS.find((a) => pathname.startsWith(a.prefix));
  if (!area) return NextResponse.next();

  // Легаси PIN-доступ — только для /manager, временный резервный вход.
  if (area.prefix === "/manager") {
    if (!isManagerAuthEnabled()) return NextResponse.next();
    const pin = req.cookies.get(getManagerCookieName())?.value;
    if (isValidManagerSession(pin)) return NextResponse.next();
  }

  // Supabase Auth — основной путь для всех трёх разделов.
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

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles ( name )")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const roles = extractRoleNames(roleRows);
  const allowed = roles.some((r) => area.roles.includes(r));
  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = "/staff/unauthorized";
    return NextResponse.redirect(url);
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
