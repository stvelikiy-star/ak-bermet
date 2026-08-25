"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/locale";
import { IconGlobe, IconChevronDown } from "@/components/ui/icons";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export default function LanguageSwitcher({
  locale,
  variant = "desktop",
}: {
  locale: Locale;
  variant?: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const choose = (next: Locale) => {
    setLocaleCookie(next);
    setOpen(false);
    router.refresh();
  };

  if (variant === "mobile") {
    return (
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => choose(l.code)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              l.code === locale
                ? "border-gold bg-gold/15 text-gold-soft"
                : "border-white/20 text-white/70 hover:border-gold/60 hover:text-gold-soft"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Сменить язык"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:border-gold/60 hover:text-gold-soft"
      >
        <IconGlobe className="h-4 w-4" />
        {current.label}
        <IconChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-32 overflow-hidden rounded-xl border border-gold/20 bg-emerald-deep shadow-float">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => choose(l.code)}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                  l.code === locale
                    ? "bg-gold/15 text-gold-soft"
                    : "text-white/80 hover:bg-white/5 hover:text-gold-soft"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
