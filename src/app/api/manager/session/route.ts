import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "@/lib/manager-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const authenticated =
    !isManagerAuthEnabled() ||
    isValidManagerSession(store.get(getManagerCookieName())?.value);
  return NextResponse.json({ ok: true, authenticated });
}
