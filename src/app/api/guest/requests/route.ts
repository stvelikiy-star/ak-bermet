import { NextRequest, NextResponse } from "next/server";
import { findGuestRoomByToken, isGuestRequestType } from "@/lib/guest-qr";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
const MAX_MESSAGE_LENGTH = 2000;
export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const requestType = payload.requestType;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!isGuestRequestType(requestType) || message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  const guest = await findGuestRoomByToken(token);
  if (!guest) return NextResponse.json({ ok: false, code: "INVALID_OR_EXPIRED_QR" }, { status: 403 });
  const { data, error } = await getSupabaseAdminClient().from("guest_service_requests").insert({ guest_room_access_token_id: guest.id, room_unit_id: guest.roomUnitId, request_type: requestType, message: message || null }).select("id, request_type, status, created_at").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "REQUEST_CREATE_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true, request: data }, { status: 201 });
}
