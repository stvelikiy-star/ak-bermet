import { NextResponse } from "next/server";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";
import { buildLead } from "@/lib/lead-utils";
import { isGoogleSheetsEnabled, appendLeadToSheet } from "@/lib/google-sheets";
import { persistPublicLead } from "@/lib/public-lead-persistence";

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

  // Полный объект заявки: временный transport id + createdAt + status:"new".
  // Канонический UUID создаёт Supabase и именно он возвращается клиенту.
  const lead = buildLead(input as LeadInput);

  let persistedLead: Awaited<ReturnType<typeof persistPublicLead>>;
  try {
    // Production invariant: success may be returned only after the
    // authoritative durable Supabase write has completed.
    persistedLead = await persistPublicLead(lead);
  } catch (error) {
    console.error("[LEAD] Supabase durable insert failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Заявка сейчас не может быть надёжно сохранена. Пожалуйста, повторите позже или напишите в WhatsApp.",
      },
      { status: 503 }
    );
  }

  // Google Sheets is a secondary compatibility/sync destination only.
  // Its outage must never turn an already durable Supabase write into a
  // false client failure or duplicate retry. Use the canonical DB UUID in
  // the secondary record so future reconciliation has one stable identity.
  if (isGoogleSheetsEnabled()) {
    try {
      await appendLeadToSheet({ ...lead, id: persistedLead.id });
    } catch (error) {
      console.warn("[LEAD] Secondary Google Sheets sync failed:", error);
    }
  }

  return NextResponse.json({ ok: true, leadId: persistedLead.id });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
