import { NextResponse } from "next/server";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  getManagerSessionHours,
  verifyManagerPin,
  createManagerSessionValue,
} from "@/lib/manager-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { pin?: string };
  try {
    body = (await request.json()) as { pin?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный запрос" },
      { status: 400 }
    );
  }

  // Если авторизация выключена — вход не требуется.
  if (!isManagerAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const pin = String(body?.pin ?? "");
  // PIN не логируется.
  if (!verifyManagerPin(pin)) {
    return NextResponse.json({ ok: false, message: "Неверный PIN" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getManagerCookieName(), createManagerSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: getManagerSessionHours() * 3600,
    path: "/",
  });
  return res;
}
