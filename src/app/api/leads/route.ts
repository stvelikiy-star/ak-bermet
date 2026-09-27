import { NextResponse } from "next/server";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";
import { buildLead } from "@/lib/lead-utils";
import { persistPublicLead } from "@/lib/public-lead-persistence";
import { createMarinaReservationRequest, isMarinaBookingSource } from "@/lib/marina-core";

export const runtime = "nodejs";

function marinaBookingNotes(input: LeadInput): string {
  const facts = [
    input.roomCategory ? `Категория с сайта: ${input.roomCategory}` : null,
    input.childrenAges ? `Возраст детей: ${input.childrenAges}` : null,
    input.wantsDoubleBed ? "Пожелание: двуспальная кровать" : null,
    input.needsExtraBed ? "Пожелание: дополнительное место" : null,
    input.needsWifi ? "Пожелание: Wi-Fi" : null,
    input.needsLowerFloor ? "Пожелание: нижний этаж" : null,
    input.message?.trim() ? `Комментарий: ${input.message.trim()}` : null,
    `Исходный interest: ${input.interest}`,
  ].filter(Boolean);
  return facts.join("\n").slice(0, 2000);
}

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

  const { ok, errors } = validateLead(input);
  if (!ok) {
    const message =
      Object.values(errors)[0] ?? "Проверьте правильность заполнения";
    return NextResponse.json({ ok: false, message, errors }, { status: 422 });
  }

  if (
    isMarinaBookingSource() &&
    (input.interest === "rooms" || input.interest === "garden")
  ) {
    const marinaErrors: Record<string, string> = {};
    if (!input.checkIn) marinaErrors.checkIn = "Укажите дату заезда";
    if (!input.checkOut) marinaErrors.checkOut = "Укажите дату выезда";
    if (!input.adults || input.adults < 1) marinaErrors.adults = "Укажите количество взрослых";
    if (Object.keys(marinaErrors).length) {
      return NextResponse.json(
        {
          ok: false,
          message: Object.values(marinaErrors)[0],
          errors: marinaErrors,
        },
        { status: 422 },
      );
    }

    try {
      const marina = await createMarinaReservationRequest({
        guest_name: input.name!.trim(),
        phone: input.phone!.trim(),
        check_in: input.checkIn!,
        check_out: input.checkOut!,
        adults: input.adults!,
        children: input.children ?? 0,
        source: "WEB_AK_BERMET",
        notes: marinaBookingNotes(input as LeadInput),
      });
      return NextResponse.json({
        ok: true,
        leadId: marina.id,
        source: "marina",
        isReservation: false,
      });
    } catch (error) {
      console.error("[LEAD] MARINA ReservationRequest failed");
      return NextResponse.json(
        {
          ok: false,
          message:
            "Заявка сейчас не может быть надёжно сохранена в системе бронирования. Пожалуйста, повторите позже или напишите в WhatsApp.",
        },
        { status: 503 },
      );
    }
  }

  // The public request path has exactly one durable write contract:
  // Supabase/PostgreSQL. Google Sheets mirroring is asynchronous through the
  // DB outbox and is never called from this HTTP request.
  const lead = buildLead(input as LeadInput);

  let persistedLead: Awaited<ReturnType<typeof persistPublicLead>>;
  try {
    persistedLead = await persistPublicLead(lead);
  } catch {
    // Do not serialize/log database errors, request payloads or credentials.
    console.error("[LEAD] Supabase durable insert failed");
    return NextResponse.json(
      {
        ok: false,
        message:
          "Заявка сейчас не может быть надёжно сохранена. Пожалуйста, повторите позже или напишите в WhatsApp.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, leadId: persistedLead.id });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
