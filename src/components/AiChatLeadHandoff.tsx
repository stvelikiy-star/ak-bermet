"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ChatTopic } from "@/types/chat";
import type { Locale } from "@/i18n/locale";
import { buildAiChatLeadInput } from "@/lib/ai/chat-lead-handoff";

type Props = {
  topic?: ChatTopic;
  page?: string | null;
  lastUserMessage?: string | null;
  locale?: Locale;
};

const COPY: Record<
  Locale,
  {
    success: string;
    intro: string;
    name: string;
    phone: string;
    saving: string;
    submit: string;
    error: string;
  }
> = {
  ru: {
    success:
      "Заявка сохранена в CRM и передана менеджеру. Это ещё не подтверждение брони.",
    intro:
      "Оставьте имя и телефон — заявка сохранится в CRM для менеджера. Бронь подтверждает только администратор.",
    name: "Ваше имя",
    phone: "Телефон / WhatsApp",
    saving: "Сохраняем…",
    submit: "Передать заявку менеджеру",
    error: "Не удалось сохранить заявку. Попробуйте ещё раз.",
  },
  kg: {
    success:
      "Өтүнмө CRMге сакталды жана менеджерге өткөрүлдү. Бул брондун ырасталышы эмес.",
    intro:
      "Атыңызды жана телефонуңузду калтырыңыз — өтүнмө менеджер үчүн CRMге сакталат. Бронду администратор гана ырастайт.",
    name: "Атыңыз",
    phone: "Телефон / WhatsApp",
    saving: "Сакталууда…",
    submit: "Өтүнмөнү менеджерге өткөрүү",
    error: "Өтүнмөнү сактоо мүмкүн болгон жок. Кайра аракет кылыңыз.",
  },
  en: {
    success:
      "The request was saved in the CRM and sent to the manager. This is not yet a booking confirmation.",
    intro:
      "Leave your name and phone number — the request will be saved in the CRM for the manager. Only the administrator confirms the booking.",
    name: "Your name",
    phone: "Phone / WhatsApp",
    saving: "Saving…",
    submit: "Send request to manager",
    error: "Could not save the request. Please try again.",
  },
  kz: {
    success:
      "Өтінім CRM жүйесіне сақталып, менеджерге жіберілді. Бұл әлі брондаудың расталуы емес.",
    intro:
      "Атыңыз бен телефоныңызды қалдырыңыз — өтінім менеджер үшін CRM жүйесіне сақталады. Брондауды тек әкімші растайды.",
    name: "Атыңыз",
    phone: "Телефон / WhatsApp",
    saving: "Сақталуда…",
    submit: "Өтінімді менеджерге жіберу",
    error: "Өтінімді сақтау мүмкін болмады. Қайта көріңіз.",
  },
};

export default function AiChatLeadHandoff({
  topic,
  page,
  lastUserMessage,
  locale = "ru",
}: Props) {
  const copy = COPY[locale];
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
        throw new Error(copy.error);
      }
      setSent(true);
    } catch {
      setError(copy.error);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-900/60 px-3 py-3 text-[12px] text-emerald-100">
        {copy.success}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-2 rounded-xl border border-white/10 bg-emerald-900/55 p-3"
    >
      <p className="text-[11px] leading-relaxed text-white/70">{copy.intro}</p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={copy.name}
        autoComplete="name"
        maxLength={120}
        required
        className="w-full rounded-lg border border-white/15 bg-emerald-950/60 px-3 py-2 text-[12px] text-white placeholder:text-white/40 focus:border-gold/60"
      />
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder={copy.phone}
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
        {sending ? copy.saving : copy.submit}
      </button>
    </form>
  );
}
