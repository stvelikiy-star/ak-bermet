import { NextResponse } from "next/server";
import type { ChatRequest } from "@/types/chat";
import { generateAIResponse } from "@/lib/ai/providers";
import { shouldForceHandoff } from "@/lib/ai/handoff";
import { actionsForTopic } from "@/lib/ai/suggested-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Partial<ChatRequest>;

  try {
    body = (await request.json()) as Partial<ChatRequest>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный формат запроса" },
      { status: 400 }
    );
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json(
      { ok: false, message: "Сообщение не должно быть пустым" },
      { status: 400 }
    );
  }

  try {
    // Real AI (если включён) или mock — внутри уже есть fallback на mock.
    const base = await generateAIResponse({
      message,
      history: body.history,
      page: body.page,
    });

    // Принудительный handoff по чувствительным темам.
    const shouldHandoff = Boolean(base.shouldHandoff) || shouldForceHandoff(message, base.message);

    // Если провайдер не вернул действия — добавляем по теме.
    const suggestedActions =
      base.suggestedActions && base.suggestedActions.length
        ? base.suggestedActions
        : actionsForTopic(base.topic ?? "general");

    return NextResponse.json({
      ok: true,
      message: base.message,
      topic: base.topic ?? "general",
      suggestedActions,
      shouldHandoff,
    });
  } catch (error) {
    console.error("[CHAT] route failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Не удалось получить ответ. Попробуйте ещё раз или напишите администратору в WhatsApp.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
