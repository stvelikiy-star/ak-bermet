import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { isSupabaseConfigured } from "@/lib/supabase-admin";
import { ManagerLeadUpdateError, updateManagerLead } from "@/lib/manager-leads-supabase";
import { STATUS_ORDER } from "@/lib/manager-utils";
import type { LeadStatus } from "@/types/lead";

export const runtime = "nodejs";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

function isValidIsoTimestamp(value: string): boolean {
  return value.length <= 64 && Number.isFinite(Date.parse(value));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!staff || !hasAnyRole(staff, [...MANAGER_ROLES])) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный запрос" },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, message: "Некорректный запрос" },
      { status: 422 }
    );
  }

  const payload = body as {
    status?: LeadStatus;
    managerComment?: string;
    expectedUpdatedAt?: string | null;
  };

  const status = payload.status;
  if (!status || !STATUS_ORDER.includes(status)) {
    return NextResponse.json(
      { ok: false, message: "Некорректный статус" },
      { status: 422 }
    );
  }

  if (
    payload.managerComment !== undefined &&
    (typeof payload.managerComment !== "string" ||
      payload.managerComment.length > 5000)
  ) {
    return NextResponse.json(
      { ok: false, message: "Некорректный комментарий менеджера" },
      { status: 422 }
    );
  }

  if (
    typeof payload.expectedUpdatedAt !== "string" ||
    !isValidIsoTimestamp(payload.expectedUpdatedAt)
  ) {
    return NextResponse.json(
      { ok: false, message: "Обновите список заявок перед сохранением." },
      { status: 409 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, message: "CRM-база не настроена." },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    if (!id || id.length > 100) {
      return NextResponse.json(
        { ok: false, message: "Некорректный ID заявки" },
        { status: 422 }
      );
    }

    const updatedAt = await updateManagerLead({
      leadId: id,
      status,
      managerComment: payload.managerComment ?? "",
      managerUserId: staff.userId,
      expectedUpdatedAt: payload.expectedUpdatedAt,
    });

    return NextResponse.json({ ok: true, updatedAt });
  } catch (error) {
    if (error instanceof ManagerLeadUpdateError && error.code === "stale") {
      return NextResponse.json(
        {
          ok: false,
          message: "Заявка уже изменена другим сотрудником. Обновите список.",
        },
        { status: 409 }
      );
    }
    // Raw database errors are intentionally not logged or returned.
    console.error("[MANAGER_LEADS] Supabase update failed");
    return NextResponse.json(
      {
        ok: false,
        message: "Не удалось сохранить изменения. Попробуйте ещё раз.",
      },
      { status: 500 }
    );
  }
}
