import { NextResponse } from "next/server";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";
import { buildLead } from "@/lib/lead-utils";
import { persistPublicLead } from "@/lib/public-lead-persistence";
import { createMarinaBookingRequest, MarinaSmartError } from "@/lib/marina-smart";

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

  const { ok, errors } = validateLead(input);
  if (!ok) {
    const message =
      Object.values(errors)[0] ?? "Проверьте правильность заполнения";
    return NextResponse.json({ ok: false, message, errors }, { status: 422 });
  }

  const validated = input as LeadInput;
  const isAccommodationRequest =
    validated.interest === "rooms" ||
    validated.interest === "garden" ||
    validated.interest === "promo";

  if (isAccommodationRequest) {
    try {
      const requestItem = await createMarinaBookingRequest(validated);
      return NextResponse.json({
        ok: true,
        leadId: requestItem.id,
        authority: "marina-smart",
        isReservation: requestItem.is_reservation,
      });
    } catch (error) {
      console.error("[LEAD] MARINA SMART booking request failed");
      const status =
        error instanceof MarinaSmartError && error.status === 422 ? 422 : 503;
      const message =
        error instanceof MarinaSmartError
          ? error.message
          : "MARINA SMART временно недоступна. Заявка не была сохранена.";
      return NextResponse.json({ ok: false, message }, { status });
    }
  }

  // Non-accommodation inquiries (SPA, events, food, general) remain in the
  // website CRM. Accommodation availability and booking requests have one
  // operational authority: MARINA SMART.
  const lead = buildLead(validated);

  let persistedLead: Awaited<ReturnType<typeof persistPublicLead>>;
  try {
    persistedLead = await persistPublicLead(lead);
  } catch {
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

  return NextResponse.json({
    ok: true,
    leadId: persistedLead.id,
    authority: "website-crm",
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
