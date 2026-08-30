"use client";

import { FormEvent, useState } from "react";
import type { ChatTopic } from "@/types/chat";
import { buildAiChatLeadInput } from "@/lib/ai/chat-lead-handoff";

type Props = {
  topic?: ChatTopic;
  page?: string | null;
  lastUserMessage?: string | null;
};

export default function AiChatLeadHandoff({ topic, page, lastUserMessage }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || sent) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildAiChatLeadInput({
            name,
            phone,
            topic,
            page,
            lastUserMessage,
          }),
        ),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Не удалось сохранить заявку");
      }
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить заявку");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-900/60 px-3 py-3 text-[12px] text-emerald-100">
        Заявка сохранена в CRM и передана менеджеру. Это ещё не подтверждение брони.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-2 rounded-xl border border-white/10 bg-emerald-900/55 p-3"
    >
      <p className="text-[11px] leading-relaxed text-white/70">
        Оставьте имя и телефон — заявка сохранится в CRM для менеджера. Бронь подтверждает только администратор.
      </p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ваше имя"
        autoComplete="name"
        maxLength={120}
        required
        className="w-full rounded-lg border border-white/15 bg-emerald-950/60 px-3 py-2 text-[12px] text-white placeholder:text-white/40 focus:border-gold/60"
      />
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Телефон / WhatsApp"
        autoComplete="tel"
        inputMode="tel"
        maxLength={60}
        required
        className="w-full rounded-lg border border-white/15 bg-emerald-950/60 px-3 py-2 text-[12px] text-white placeholder:text-white/40 focus:border-gold/60"
      />
      {error && <p className="text-[11px] text-red-200">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-full bg-white/10 px-3 py-2 text-[12px] font-semibold text-gold-soft transition-colors hover:bg-white/15 disabled:opacity-50"
      >
        {sending ? "Сохраняем…" : "Передать заявку менеджеру"}
      </button>
    </form>
  );
}
