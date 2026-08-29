import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

type PaymentAction = "record" | "void";

interface RecordPayload {
  action: "record";
  bookingId: string;
  paidAt: string;
  method: string;
  amountKgs: number;
  receiptUrl?: string;
  notes?: string;
}

interface VoidPayload {
  action: "void";
  paymentId: string;
  reason: string;
}

type PaymentPayload = RecordPayload | VoidPayload;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoTimestamp(value: string): boolean {
  if (!value || value.length > 64) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parsePayload(value: unknown): PaymentPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const action: PaymentAction | null = input.action === "record" || input.action === "void" ? input.action : null;
  if (!action) return null;

  if (action === "void") {
    const paymentId = typeof input.paymentId === "string" ? input.paymentId.trim() : "";
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (!isUuid(paymentId) || !reason || reason.length > 1000) return null;
    return { action, paymentId, reason };
  }

  const bookingId = typeof input.bookingId === "string" ? input.bookingId.trim() : "";
  const paidAt = typeof input.paidAt === "string" ? input.paidAt.trim() : "";
  const method = typeof input.method === "string" ? input.method.trim() : "";
  const amountKgs = typeof input.amountKgs === "number" ? input.amountKgs : Number.NaN;
  const receiptUrl = typeof input.receiptUrl === "string" ? input.receiptUrl.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!isUuid(bookingId) || !isIsoTimestamp(paidAt) || !method) return null;
  if (!Number.isFinite(amountKgs) || amountKgs <= 0) return null;
  if (!isHttpUrl(receiptUrl)) return null;
  if (method.length > 120 || receiptUrl.length > 2000 || notes.length > 4000) return null;

  return { action, bookingId, paidAt, method, amountKgs, receiptUrl, notes };
}

function publicError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "42501") return { status: 403, code: "ACCESS_DENIED" };
  if (error.code === "22023") {
    const known = new Set([
      "booking_id_required",
      "paid_at_required",
      "payment_method_required",
      "invalid_payment_amount",
      "payment_field_too_long",
      "booking_not_found",
      "void_reason_required",
      "payment_not_found",
      "payment_already_void",
    ]);
    const message = error.message ?? "";
    return { status: 400, code: known.has(message) ? message.toUpperCase() : "INVALID_PAYMENT" };
  }
  return { status: 500, code: "PAYMENT_WRITE_FAILED" };
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
    return NextResponse.json({ ok: false, code: "INVALID_PAYMENT" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "AUTH_CONFIGURATION" }, { status: 503 });
  }

  if (payload.action === "void") {
    const { data, error } = await supabase.rpc("fn_void_manual_payment", {
      p_payment_id: payload.paymentId,
      p_reason: payload.reason,
    });
    if (error) {
      const safe = publicError(error);
      return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
    }
    const result = Array.isArray(data) ? data[0] : null;
    if (!result?.payment_id) {
      return NextResponse.json({ ok: false, code: "PAYMENT_WRITE_FAILED" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      payment: {
        id: result.payment_id,
        bookingId: result.result_booking_id,
        status: "void",
        confirmedTotalKgs: Number(result.current_confirmed_total_kgs ?? 0),
        balanceKgs: Number(result.current_balance_kgs ?? 0),
      },
    });
  }

  const { data, error } = await supabase.rpc("fn_record_manual_payment", {
    p_booking_id: payload.bookingId,
    p_paid_at: payload.paidAt,
    p_method: payload.method,
    p_amount_kgs: payload.amountKgs,
    p_receipt_url: payload.receiptUrl || null,
    p_notes: payload.notes || null,
  });
  if (error) {
    const safe = publicError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result?.payment_id) {
    return NextResponse.json({ ok: false, code: "PAYMENT_WRITE_FAILED" }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      payment: {
        id: result.payment_id,
        bookingId: result.result_booking_id,
        amountKgs: Number(result.amount_kgs ?? 0),
        balanceKgs: Number(result.balance_after_kgs ?? 0),
        status: "confirmed",
      },
    },
    { status: 201 },
  );
}
