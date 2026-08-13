import { NextResponse } from "next/server";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";
import { buildLead } from "@/lib/lead-utils";
import { persistPublicLead } from "@/lib/public-lead-persistence";

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
