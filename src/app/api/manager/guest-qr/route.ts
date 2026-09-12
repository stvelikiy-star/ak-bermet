import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createGuestToken, guestPortalUrl, hashGuestToken, isUuidValue } from "@/lib/guest-qr";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
function forbidden() { return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 }); }
function parseExpiry(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const days = Number(value);
  if (!Number.isInteger(days) || days < 7 || days > 730) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
export async function GET() {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  const { data, error } = await getSupabaseAdminClient().from("guest_room_access_tokens")
    .select("id, room_unit_id, label, expires_at, created_at, room_units ( room_number, buildings ( name ) )")
    .is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, code: "QR_READ_FAILED" }, { status: 503 });
  const items = (data ?? []).map((item) => {
    const room = Array.isArray(item.room_units) ? item.room_units[0] : item.room_units;
    const building = room && (Array.isArray(room.buildings) ? room.buildings[0] : room.buildings);
    return { id: item.id, roomUnitId: item.room_unit_id, roomNumber: room?.room_number ?? "—", buildingName: building?.name ?? "AK BERMET", label: item.label, expiresAt: item.expires_at, createdAt: item.created_at };
  });
  return NextResponse.json({ ok: true, items });
}
export async function POST(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const roomUnitId = typeof payload.roomUnitId === "string" ? payload.roomUnitId.trim() : "";
  const label = typeof payload.label === "string" ? payload.label.trim() : "Guest QR";
  const expiresAt = parseExpiry(payload.expiresInDays);
  if (!isUuidValue(roomUnitId) || !label || label.length > 120 || !expiresAt) return NextResponse.json({ ok: false, code: "INVALID_QR_REQUEST" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data: room, error: roomError } = await admin.from("room_units").select("id, room_number, buildings ( name )").eq("id", roomUnitId).is("deleted_at", null).maybeSingle();
  if (roomError || !room) return NextResponse.json({ ok: false, code: "ROOM_NOT_FOUND" }, { status: 404 });
  const rotationTime = new Date().toISOString();
  const { data: revokedRows, error: revokeError } = await admin
    .from("guest_room_access_tokens")
    .update({ revoked_at: rotationTime })
    .eq("room_unit_id", roomUnitId)
    .is("revoked_at", null)
    .select("id");
  if (revokeError) return NextResponse.json({ ok: false, code: "QR_ROTATION_FAILED" }, { status: 503 });

  const token = createGuestToken();
  const { data: inserted, error } = await admin
    .from("guest_room_access_tokens")
    .insert({
      room_unit_id: roomUnitId,
      token_hash: hashGuestToken(token),
      label,
      expires_at: expiresAt.toISOString(),
      created_by: staff?.userId ?? null,
    })
    .select("id, room_unit_id, label, expires_at, created_at")
    .single();

  if (error || !inserted) {
    // Do not leave the room without access if token creation fails after rotation.
    const revokedIds = (revokedRows ?? []).map((row) => row.id).filter(Boolean);
    if (revokedIds.length > 0) {
      await admin
        .from("guest_room_access_tokens")
        .update({ revoked_at: null })
        .in("id", revokedIds);
    }
    return NextResponse.json({ ok: false, code: "QR_CREATE_FAILED" }, { status: 503 });
  }
  const url = guestPortalUrl(new URL(request.url).origin, token);
  const qrDataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
  const building = Array.isArray(room.buildings) ? room.buildings[0] : room.buildings;
  return NextResponse.json({ ok: true, item: { id: inserted.id, roomUnitId: inserted.room_unit_id, roomNumber: room.room_number, buildingName: building?.name ?? "AK BERMET", label: inserted.label, expiresAt: inserted.expires_at, createdAt: inserted.created_at, url, qrDataUrl } }, { status: 201 });
}
export async function DELETE(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return forbidden();
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!isUuidValue(id)) return NextResponse.json({ ok: false, code: "INVALID_QR_ID" }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from("guest_room_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) return NextResponse.json({ ok: false, code: "QR_REVOKE_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
