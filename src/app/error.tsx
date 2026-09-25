"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/i18n/locale";
import { t } from "@/i18n/dictionary";
import { waFor } from "@/data/site";

function readBrowserLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readBrowserLocale());
    console.error("[PUBLIC_UI_ERROR]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-cream px-4 pb-20 pt-32">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold-dark">
          AK BERMET
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-emerald-deep sm:text-5xl">
          {t("Что-то пошло не так", locale)}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          {t(
            "Попробуйте ещё раз. Если ошибка повторится, напишите нам в WhatsApp.",
            locale,
          )}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-emerald-deep px-6 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
          >
            {t("Попробовать снова", locale)}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-gold/40 bg-milk px-6 py-3 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            {t("Вернуться на главную", locale)}
          </Link>
          <a
            href={waFor("booking", locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-gold/40 bg-milk px-6 py-3 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
