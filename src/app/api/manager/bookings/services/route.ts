import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { isIsoDate } from "@/lib/booking-chessboard-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rpcError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "42501") return { status: 403, code: "ACCESS_DENIED" };
  if (error.code === "22023") {
    const known = new Set([
      "invalid_service_quantity",
      "booking_not_found",
      "service_not_found",
      "manual_service_price_required",
      "invalid_service_status",
      "booking_service_not_found",
    ]);
    const message = error.message ?? "";
    return { status: 400, code: known.has(message) ? message.toUpperCase() : "INVALID_SERVICE" };
  }
  return { status: 500, code: "SERVICE_UPDATE_FAILED" };
}

async function authorizedClient() {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) return null;
  return createSupabaseServerClient();
}

export async function POST(request: NextRequest) {
  const supabase = await authorizedClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE" }, { status: 400 });
  }

  const input = raw as Record<string, unknown>;
  const bookingId = typeof input.bookingId === "string" ? input.bookingId.trim() : "";
  const serviceCode = typeof input.serviceCode === "string" ? input.serviceCode.trim().toUpperCase() : "";
  const quantity = Number(input.quantity ?? 1);
  const unitPriceKgs = input.unitPriceKgs === null || input.unitPriceKgs === undefined || input.unitPriceKgs === ""
    ? null
    : Number(input.unitPriceKgs);
  const scheduledFor = typeof input.scheduledFor === "string" ? input.scheduledFor.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!isUuid(bookingId) || !serviceCode || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE" }, { status: 400 });
  }
  if (unitPriceKgs !== null && (!Number.isFinite(unitPriceKgs) || unitPriceKgs < 0)) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE_PRICE" }, { status: 400 });
  }
  if (scheduledFor && !isIsoDate(scheduledFor)) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE_DATE" }, { status: 400 });
  }
  if (notes.length > 2000) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE_NOTES" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_add_booking_service", {
    p_booking_id: bookingId,
    p_service_code: serviceCode,
    p_quantity: quantity,
    p_unit_price_kgs: unitPriceKgs,
    p_scheduled_for: scheduledFor || null,
    p_notes: notes || null,
  });

  if (error) {
    const safe = rpcError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.booking_service_id) {
    return NextResponse.json({ ok: false, code: "SERVICE_UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    service: {
      id: row.booking_service_id,
      bookingId: row.booking_id,
      code: row.service_code,
      totalAmountKgs: Number(row.total_amount_kgs ?? 0),
    },
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await authorizedClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE" }, { status: 400 });
  }

  const input = raw as Record<string, unknown>;
  const bookingServiceId = typeof input.bookingServiceId === "string" ? input.bookingServiceId.trim() : "";
  const status = typeof input.status === "string" ? input.status.trim() : "";
  if (!isUuid(bookingServiceId) || !["planned", "confirmed", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ ok: false, code: "INVALID_SERVICE" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_set_booking_service_status", {
    p_booking_service_id: bookingServiceId,
    p_status: status,
  });

  if (error) {
    const safe = rpcError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }

  return NextResponse.json({ ok: true, status: data });
}
