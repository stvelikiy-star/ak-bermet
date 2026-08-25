// Клиент-безопасные константы (без next/headers) — можно импортировать
// и из "use client" компонентов, и с сервера.
export type Locale = "ru" | "kg" | "en" | "kz";

export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "ak_locale";

export const LOCALES: { code: Locale; label: string; htmlLang: string }[] = [
  { code: "ru", label: "Рус", htmlLang: "ru" },
  { code: "kg", label: "Кыр", htmlLang: "ky" },
  { code: "en", label: "Eng", htmlLang: "en" },
  { code: "kz", label: "Қаз", htmlLang: "kk" },
];

export function isLocale(value: string | undefined): value is Locale {
  return !!value && LOCALES.some((l) => l.code === value);
}

export function htmlLangFor(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.htmlLang ?? "ru";
}
