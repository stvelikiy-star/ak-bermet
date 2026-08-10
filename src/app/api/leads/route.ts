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

  // Production invariant: success may be returned only after a durable write.
  // Server logs and process-local/mock storage are not durable lead storage.
  if (!isGoogleSheetsEnabled()) {
    console.error("[LEAD] Durable persistence is unavailable: Google Sheets is disabled or not configured.");
    return NextResponse.json(
      {
        ok: false,
        message:
          "Заявка сейчас не может быть надёжно сохранена. Пожалуйста, повторите позже или напишите в WhatsApp.",
      },
      { status: 503 }
    );
  }

  try {
    await appendLeadToSheet(lead);
  } catch (error) {
    // Логируем техническую ошибку только на сервере и fail closed:
    // клиент не получает success, пока durable write не завершился.
    console.error("[LEAD] Google Sheets append failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Заявка принята не была. Пожалуйста, попробуйте ещё раз или напишите в WhatsApp.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
