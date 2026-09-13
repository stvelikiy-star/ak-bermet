import { NextRequest, NextResponse } from "next/server";
import { hashGuestToken, isGuestRequestType } from "@/lib/guest-qr";
import { getSupabasePublicClient } from "@/lib/supabase/public-client";

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const requestType = payload.requestType;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token) || !isGuestRequestType(requestType) || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  // The database validates the token, booking status and booking-room binding
  // and performs the insert atomically. No service-role bypass is involved.
  const { data, error } = await getSupabasePublicClient().rpc("fn_public_create_guest_request", {
    p_token_hash: hashGuestToken(token),
    p_request_type: requestType,
    p_message: message || null,
  });

  if (error) {
    if (error.message?.includes("INVALID_OR_EXPIRED_QR")) {
      return NextResponse.json({ ok: false, code: "INVALID_OR_EXPIRED_QR" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, code: "REQUEST_CREATE_FAILED" }, { status: 503 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ ok: false, code: "REQUEST_CREATE_FAILED" }, { status: 503 });

  return NextResponse.json({
    ok: true,
    request: {
      id: row.request_id,
      booking_id: row.booking_id,
      request_type: row.request_type,
      status: row.status,
      created_at: row.created_at,
    },
  }, { status: 201 });
}
