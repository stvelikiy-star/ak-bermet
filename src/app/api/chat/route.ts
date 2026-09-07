import { NextResponse } from "next/server";
import type { ChatMessage, ChatRequest } from "@/types/chat";
import { generateAIResponse } from "@/lib/ai/providers";
import { shouldForceHandoff } from "@/lib/ai/handoff";
import { actionsForTopic } from "@/lib/ai/suggested-actions";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_CONTENT_LENGTH = 4_000;
const MAX_METADATA_LENGTH = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeHistory(value: unknown): ChatMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_ITEMS) return null;

  const result: ChatMessage[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    if (item.role !== "user" && item.role !== "assistant") return null;
    if (
      typeof item.content !== "string" ||
      item.content.length === 0 ||
      item.content.length > MAX_HISTORY_CONTENT_LENGTH
    ) {
      return null;
    }
    if (
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      item.id.length > MAX_METADATA_LENGTH ||
      typeof item.createdAt !== "string" ||
      item.createdAt.length === 0 ||
      item.createdAt.length > MAX_METADATA_LENGTH
    ) {
      return null;
    }
    result.push({
      id: item.id,
      role: item.role,
      content: item.content,
      createdAt: item.createdAt,
    });
  }
  return result;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Запрос слишком большой" },
      { status: 413 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Некорректный формат запроса" },
      { status: 400 }
    );
  }

  if (!isRecord(raw)) {
    return NextResponse.json(
      { ok: false, message: "Некорректный формат запроса" },
      { status: 422 }
    );
  }

  if (typeof raw.message !== "string") {
    return NextResponse.json(
      { ok: false, message: "Сообщение должно быть текстом" },
      { status: 422 }
    );
  }
  const message = raw.message.trim();
  if (!message) {
    return NextResponse.json(
      { ok: false, message: "Сообщение не должно быть пустым" },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "Сообщение слишком длинное" },
      { status: 422 }
    );
  }

  if (
    raw.page !== undefined &&
    (typeof raw.page !== "string" || raw.page.length > MAX_METADATA_LENGTH)
  ) {
    return NextResponse.json(
      { ok: false, message: "Некорректная страница" },
      { status: 422 }
    );
  }

  const history = normalizeHistory(raw.history);
  if (history === null) {
    return NextResponse.json(
      { ok: false, message: "Некорректная история диалога" },
      { status: 422 }
    );
  }

  const body: ChatRequest = {
    message,
    history,
    page: raw.page as string | undefined,
  };

  try {
    // Mock работает только в явно выбранном mock-режиме. Real AI fail-closed.
    const base = await generateAIResponse(body);

    // Принудительный handoff по чувствительным темам.
    const shouldHandoff =
      Boolean(base.shouldHandoff) ||
      shouldForceHandoff(message, base.message);

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
  } catch {
    // Не логируем исходную ошибку: provider response может содержать
    // чувствительные внутренние сведения. Клиент получает безопасный handoff.
    console.error("[CHAT] AI response unavailable");
    return NextResponse.json(
      {
        ok: false,
        message:
          "Не удалось получить ответ. Попробуйте ещё раз или напишите администратору в WhatsApp.",
        shouldHandoff: true,
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Используйте POST" },
    { status: 405 }
  );
}
