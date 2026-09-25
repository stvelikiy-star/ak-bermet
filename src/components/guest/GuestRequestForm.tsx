"use client";

import { useState } from "react";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

const REQUESTS = [
  ["housekeeping", "Уборка"],
  ["towels", "Полотенца"],
  ["water", "Вода"],
  ["maintenance", "Техническая проблема"],
  ["restaurant", "Ресторан / питание"],
  ["other", "Другое"],
] as const;

export default function GuestRequestForm({
  token,
  locale = "ru",
}: {
  token: string;
  locale?: Locale;
}) {
  const [requestType, setRequestType] =
    useState<(typeof REQUESTS)[number][0]>("housekeeping");
  const [message, setMessage] = useState("");
  const [state, setState] =
    useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch("/api/guest/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, requestType, message }),
      });
      setState(response.ok ? "success" : "error");
      if (response.ok) setMessage("");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {REQUESTS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRequestType(value)}
            className={
              requestType === value
                ? "rounded-xl bg-emerald-deep px-3 py-3 text-sm font-semibold text-gold-soft"
                : "rounded-xl border border-gold/20 bg-cream px-3 py-3 text-sm text-emerald-deep"
            }
          >
            {t(label, locale)}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        maxLength={2000}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t("Комментарий (необязательно)", locale)}
        className="min-h-24 w-full rounded-xl border border-gold/20 bg-cream px-3 py-3 text-sm text-ink outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-emerald-deep px-5 py-3 text-sm font-semibold text-gold-soft disabled:opacity-60"
      >
        {state === "sending"
          ? t("Отправляем…", locale)
          : t("Отправить заявку", locale)}
      </button>
      {state === "success" && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("Заявка принята персоналом.", locale)}
        </p>
      )}
      {state === "error" && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {t(
            "Не удалось отправить. Попробуйте ещё раз или позвоните на стойку.",
            locale,
          )}
        </p>
      )}
    </form>
  );
}
