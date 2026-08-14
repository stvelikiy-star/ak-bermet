import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const ALLOWED_SOURCES = new Set([
  "website",
  "ai_chat",
  "whatsapp",
  "phone",
  "instagram",
  "tour_agency",
  "manual",
]);

interface ManualBookingPayload {
  roomUnitId: string;
  fullName: string;
  phone: string;
  email?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBeds: number;
  source: string;
  totalAmountKgs: number;
  notes?: string;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePayload(value: unknown): ManualBookingPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;

  const roomUnitId = typeof input.roomUnitId === "string" ? input.roomUnitId.trim() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const checkIn = typeof input.checkIn === "string" ? input.checkIn.trim() : "";
  const checkOut = typeof input.checkOut === "string" ? input.checkOut.trim() : "";
  const source = typeof input.source === "string" ? input.source.trim() : "manual";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const adults = Number(input.adults);
  const children = Number(input.children);
  const extraBeds = Number(input.extraBeds);
  const totalAmountKgs = Number(input.totalAmountKgs);

  if (!isUuid(roomUnitId) || !fullName || !phone || !isIsoDate(checkIn) || !isIsoDate(checkOut)) return null;
  if (checkOut <= checkIn) return null;
  if (!ALLOWED_SOURCES.has(source)) return null;
  if (!Number.isInteger(adults) || adults < 1) return null;
  if (!Number.isInteger(children) || children < 0) return null;
  if (!Number.isInteger(extraBeds) || extraBeds < 0) return null;
  if (!Number.isFinite(totalAmountKgs) || totalAmountKgs < 0) return null;
  if (fullName.length > 200 || phone.length > 80 || email.length > 320 || notes.length > 4000) return null;

  return {
    roomUnitId,
    fullName,
    phone,
    email,
    checkIn,
    checkOut,
    adults,
    children,
    extraBeds,
    source,
    totalAmountKgs,
    notes,
  };
}

function publicError(error: { code?: string | null; message?: string | null }): { status: number; code: string } {
  if (error.code === "23P01") return { status: 409, code: "ROOM_UNAVAILABLE" };
  if (error.code === "42501") return { status: 403, code: "ACCESS_DENIED" };
  if (error.code === "23505") return { status: 409, code: "CUSTOMER_CONFLICT" };
  if (error.code === "22023") {
    const known = new Set([
      "full_name_required",
      "phone_required",
      "invalid_booking_dates",
      "invalid_guest_counts",
      "invalid_total_amount",
      "room_not_found",
      "room_not_sellable",
      "room_operationally_blocked",
      "room_capacity_exceeded",
      "extra_bed_capacity_exceeded",
    ]);
    const message = error.message ?? "";
    return { status: 400, code: known.has(message) ? message.toUpperCase() : "INVALID_BOOKING" };
  }
  return { status: 500, code: "BOOKING_CREATE_FAILED" };
}

export async function POST(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) {
    return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const payload = parsePayload(raw);
  if (!payload) {
    return NextResponse.json({ ok: false, code: "INVALID_BOOKING" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "AUTH_CONFIGURATION" }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("fn_create_manual_booking", {
    p_room_unit_id: payload.roomUnitId,
    p_full_name: payload.fullName,
    p_phone: payload.phone,
    p_email: payload.email || null,
    p_check_in: payload.checkIn,
    p_check_out: payload.checkOut,
    p_adults: payload.adults,
    p_children: payload.children,
    p_extra_beds: payload.extraBeds,
    p_source: payload.source,
    p_total_amount_kgs: payload.totalAmountKgs,
    p_notes: payload.notes || null,
  });

  if (error) {
    const safe = publicError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result?.booking_id || !result?.booking_number) {
    return NextResponse.json({ ok: false, code: "BOOKING_CREATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      booking: {
        id: result.booking_id,
        number: result.booking_number,
      },
    },
    { status: 201 },
  );
}
