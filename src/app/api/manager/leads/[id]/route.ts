import { NextResponse } from "next/server";
import { isManagerAuthenticated } from "@/lib/manager-session";
import {
  isGoogleSheetsEnabled,
  updateLeadStatusInSheet,
} from "@/lib/google-sheets";
import { STATUS_ORDER } from "@/lib/manager-utils";
import type { LeadStatus } from "@/types/lead";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isManagerAuthenticated()) {
    return NextResponse.json({ ok: false, message: "Нет доступа" }, { status: 403 });
  }

  let body: {
    status?: LeadStatus;
    managerComment?: string;
    managerName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный запрос" },
      { status: 400 }
    );
  }

  const status = body?.status;
  if (!status || !STATUS_ORDER.includes(status)) {
    return NextResponse.json(
      { ok: false, message: "Некорректный статус" },
      { status: 422 }
    );
  }

  if (isGoogleSheetsEnabled()) {
    try {
      await updateLeadStatusInSheet({
        leadId: params.id,
        status,
        managerComment: body.managerComment,
        managerName: body.managerName || "Администратор",
      });
    } catch (error) {
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
  // В mock-режиме просто возвращаем ok.

  return NextResponse.json({ ok: true });
}
