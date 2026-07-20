import { NextResponse } from "next/server";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";
import { buildLead } from "@/lib/lead-utils";
import { isGoogleSheetsEnabled, appendLeadToSheet } from "@/lib/google-sheets";

// googleapis несовместим с Edge — используем Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: Partial<LeadInput>;

  try {
    input = (await request.json()) as Partial<LeadInput>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный формат запроса" },
      { status: 400 }
    );
  }

  // Валидация обязательных полей: name, phone, interest, source.
  const { ok, errors } = validateLead(input);
  if (!ok) {
    const message =
      Object.values(errors)[0] ?? "Проверьте правильность заполнения";
    return NextResponse.json({ ok: false, message, errors }, { status: 422 });
  }

  // Полный объект заявки: id + createdAt + status:"new".
  const lead = buildLead(input as LeadInput);

  if (isGoogleSheetsEnabled()) {
    try {
      await appendLeadToSheet(lead);
    } catch (error) {
      // Логируем техническую ошибку только на сервере.
      console.error("[LEAD] Google Sheets append failed:", error);
      // TODO Stage 06: уведомление администратора об ошибке записи.
      return NextResponse.json(
        {
          ok: false,
          message:
            "Заявка принята не была. Пожалуйста, попробуйте ещё раз или напишите в WhatsApp.",
        },
        { status: 502 }
      );
    }
  } else {
    // Google Sheets выключен — работаем в mock-режиме, заявку не теряем.
    console.warn("Google Sheets disabled. Lead saved in mock mode.");
    console.log("[LEAD] mock:", JSON.stringify(lead));
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
