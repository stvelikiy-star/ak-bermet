import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "@/lib/manager-auth";

// Защищает страницы /manager/*. Публичные страницы и API не затрагиваются
// (см. matcher). /manager/login доступен без авторизации.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/manager/login")) {
    return NextResponse.next();
  }
  if (!isManagerAuthEnabled()) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(getManagerCookieName())?.value;
  if (isValidManagerSession(cookie)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/manager/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/manager/:path*"],
};
