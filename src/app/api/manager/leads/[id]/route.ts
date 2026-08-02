import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  isGoogleSheetsEnabled,
  StaleLeadError,
  updateLeadStatusInSheet,
} from "@/lib/google-sheets";
import { STATUS_ORDER } from "@/lib/manager-utils";
import type { LeadStatus } from "@/types/lead";

export const runtime = "nodejs";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) {
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
    payload.expectedUpdatedAt !== null &&
    typeof payload.expectedUpdatedAt !== "string"
  ) {
    return NextResponse.json(
      { ok: false, message: "Некорректная версия заявки" },
      { status: 422 }
    );
  }

  if (!isGoogleSheetsEnabled()) {
    return NextResponse.json(
      { ok: false, message: "Источник заявок не настроен." },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const updatedAt = await updateLeadStatusInSheet({
      leadId: id,
      status,
      managerComment: payload.managerComment,
      managerName: staff?.fullName || staff?.email || "Сотрудник",
      expectedUpdatedAt: payload.expectedUpdatedAt ?? null,
    });
    return NextResponse.json({ ok: true, updatedAt });
  } catch (error) {
    if (error instanceof StaleLeadError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Заявка уже изменена другим сотрудником. Обновите список.",
        },
        { status: 409 }
      );
    }
    console.error("[MANAGER] updateLeadStatusInSheet failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Не удалось сохранить изменения. Попробуйте ещё раз.",
      },
      { status: 500 }
    );
  }
}
