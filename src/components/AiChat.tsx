"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ChatSuggestedAction, ChatTopic } from "@/types/chat";
import { WA } from "@/data/site";
import { whatsAppToMain, createChatHandoffText } from "@/lib/whatsapp";
import AiChatLeadHandoff from "@/components/AiChatLeadHandoff";
import {
  IconChat,
  IconClose,
  IconSend,
  IconLotus,
} from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  actions?: ChatSuggestedAction[];
  topic?: ChatTopic;
  shouldHandoff?: boolean;
  isError?: boolean;
};

const now = () =>
  new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const uid = () => `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

// Быстрые кнопки (отправляют сообщение движку)
const QUICK = [
  "Подобрать номер",
  "Горячие источники",
  "SPA",
  "Мероприятие",
];

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Здравствуйте! Я помогу с номерами, SPA, горячими источниками и бронированием. Финальное наличие и бронь подтверждает администратор.",
      time: now(),
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/chat/status")
      .then((r) => r.json())
      .then((d) => setDemoMode(!d.realCallsEnabled))
      .catch(() => setDemoMode(true));
  }, []);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { id: uid(), role: "user", content: trimmed, time: now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          page: pathname,
          history: history.slice(-8).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date().toISOString(),
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "error");
      }

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: data.message,
          time: now(),
          actions: data.suggestedActions,
          topic: data.topic,
          shouldHandoff: data.shouldHandoff,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content:
            "Не удалось получить ответ. Попробуйте ещё раз или напишите администратору в WhatsApp.",
          time: now(),
          topic: "handoff",
          isError: true,
          shouldHandoff: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handoffHref = (m: Msg) => {
    const fromAction = m.actions?.find((a) => a.type === "whatsapp")?.href;
    if (fromAction) return fromAction;
    const lastUser = [...messages].reverse().find((x) => x.role === "user");
    return whatsAppToMain(createChatHandoffText(lastUser?.content));
  };

  const isExternal = (a: ChatSuggestedAction) => a.type === "whatsapp" || a.type === "link";
  const latestHandoffMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.shouldHandoff)?.id;
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content;

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть чат" : "Открыть AI-чат"}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-emerald-800 to-emerald-deep text-gold-soft shadow-float ring-2 ring-gold/50 transition-transform hover:scale-105"
      >
        {!open && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full ring-2 ring-gold/40" />
        )}
        {open ? <IconClose className="h-6 w-6" /> : <IconChat className="h-6 w-6" />}
      </button>

      {/* Окно чата */}
      {open && (
        <div className="fixed bottom-24 right-4 z-[60] flex h-[min(80vh,600px)] w-[min(92vw,380px)] animate-chat-in flex-col overflow-hidden rounded-2xl border border-gold/30 bg-emerald-deep shadow-float">
          {/* Шапка */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-emerald-900/80 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep">
              <IconLotus className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-white">
                AI-помощник Ак-Бермет
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-gold-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {demoMode ? "Демо-режим · Онлайн 24/7" : "Онлайн 24/7"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
              className="text-white/60 transition-colors hover:text-white"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          {/* Сообщения */}
          <div
            ref={bodyRef}
            className="chat-scroll grain flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) => (
              <div key={m.id}>
                <div
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <span className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
                      <IconLotus className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-gradient-to-b from-gold-soft to-gold text-emerald-deep"
                        : m.isError
                        ? "rounded-bl-sm bg-red-900/40 text-red-100"
                        : "rounded-bl-sm bg-emerald-800/80 text-white/90"
                    }`}
                  >
                    {m.content}
                    <span
                      className={`mt-1 block text-right text-[10px] ${
                        m.role === "user" ? "text-emerald-deep/60" : "text-white/40"
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>

                {/* Suggested actions / handoff */}
                {m.role === "assistant" && (m.actions?.length || m.shouldHandoff) && (
                  <div className="ml-9 mt-2 flex flex-wrap gap-2">
                    {m.shouldHandoff && (
                      <a
                        href={handoffHref(m)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-3 py-2 text-[12px] font-semibold text-emerald-deep"
                      >
                        <WhatsAppIcon size={16} className="shrink-0" />
                        Перейти в WhatsApp к администратору
                      </a>
                    )}
                    {m.shouldHandoff && m.id === latestHandoffMessageId && (
                      <AiChatLeadHandoff
                        topic={m.topic}
                        page={pathname}
                        lastUserMessage={lastUserMessage}
                      />
                    )}
                    {!m.shouldHandoff &&
                      m.actions?.map((a, i) => (
                        <a
                          key={`${a.label}-${i}`}
                          href={a.href ?? "#"}
                          target={isExternal(a) ? "_blank" : undefined}
                          rel={isExternal(a) ? "noopener noreferrer" : undefined}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                            a.type === "whatsapp"
                              ? "bg-gradient-to-b from-gold-soft to-gold text-emerald-deep"
                              : "border border-gold/40 bg-emerald-800/50 text-gold-soft hover:bg-gold/20"
                          }`}
                        >
                          {a.label}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <span className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
                  <IconLotus className="h-4 w-4" />
                </span>
                <div className="rounded-2xl rounded-bl-sm bg-emerald-800/80 px-4 py-3 text-white/70">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-soft [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-soft [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-soft" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Быстрые кнопки */}
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 pt-3">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="rounded-full border border-gold/40 bg-emerald-800/50 px-3 py-1.5 text-[11px] font-medium text-gold-soft transition-colors hover:bg-gold/20 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <a
              href={WA.booking}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-soft to-gold px-3 py-1.5 text-[11px] font-semibold text-emerald-deep"
            >
              <WhatsAppIcon size={14} className="shrink-0" />
              WhatsApp
            </a>
          </div>

          {/* Ввод */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Напишите сообщение..."
              disabled={loading}
              className="flex-1 rounded-full border border-white/15 bg-emerald-900/60 px-4 py-2.5 text-[13px] text-white placeholder:text-white/40 focus:border-gold/60 disabled:opacity-60"
              aria-label="Сообщение помощнику"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading}
              aria-label="Отправить"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep transition-transform hover:scale-105 disabled:opacity-60"
            >
              <IconSend className="h-5 w-5" />
            </button>
          </div>

          <p className="bg-emerald-900/60 py-2 text-center text-[10px] tracking-wide text-white/45">
            Ответы предварительные · бронь подтверждает администратор
          </p>
        </div>
      )}
    </>
  );
}
