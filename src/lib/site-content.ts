import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export interface SiteContentField {
  key: string;
  section: string;
  label: string;
  source: string;
  multiline?: boolean;
}

export const SITE_CONTENT_FIELDS: readonly SiteContentField[] = [
  {
    key: "home.hero.eyebrow",
    section: "Главная · Hero",
    label: "Надзаголовок",
    source: "SPA & Wellness",
  },
  {
    key: "home.hero.title_prefix",
    section: "Главная · Hero",
    label: "Заголовок до SPA",
    source: "Ак-Бермет — отдых,",
  },
  {
    key: "home.hero.title_suffix",
    section: "Главная · Hero",
    label: "Заголовок после SPA",
    source: "и горячие источники на Иссык-Куле",
  },
  {
    key: "home.hero.description",
    section: "Главная · Hero",
    label: "Описание",
    source:
      "Оздоровительный комплекс с горячими минеральными источниками, SPA, номерами, коттеджами, трёхразовым питанием и мероприятиями рядом с Чолпон-Атой.",
    multiline: true,
  },
  {
    key: "home.hero.cta_booking",
    section: "Главная · Hero",
    label: "Кнопка бронирования",
    source: "Забронировать отдых",
  },
  {
    key: "home.hero.cta_rooms",
    section: "Главная · Hero",
    label: "Кнопка номеров",
    source: "Посмотреть номера",
  },
  {
    key: "home.contacts.eyebrow",
    section: "Главная · Контакты",
    label: "Надзаголовок",
    source: "Свяжитесь с нами",
  },
  {
    key: "home.contacts.title",
    section: "Главная · Контакты",
    label: "Заголовок",
    source: "Контакты",
  },
  {
    key: "home.contacts.cta_whatsapp",
    section: "Главная · Контакты",
    label: "Кнопка WhatsApp",
    source: "Написать в WhatsApp",
  },
  {
    key: "home.contacts.cta_availability",
    section: "Главная · Контакты",
    label: "Кнопка наличия",
    source: "Узнать наличие",
  },
  {
    key: "home.contacts.map_title",
    section: "Главная · Контакты",
    label: "Подпись карты",
    source: "Ак-Бермет на карте",
  },
  {
    key: "home.contacts.map_cta",
    section: "Главная · Контакты",
    label: "Кнопка карты",
    source: "Показать на карте (2GIS)",
  },
] as const;

export const SITE_CONTENT_KEYS = SITE_CONTENT_FIELDS.map((field) => field.key);

export function siteContentFallback(field: SiteContentField, locale: Locale): string {
  return t(field.source, locale);
}

export async function loadPublishedSiteContent(
  locale: Locale,
  keys: readonly string[] = SITE_CONTENT_KEYS,
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("site_content_public")
    .select("content_key, published_value")
    .eq("locale", locale)
    .in("content_key", [...keys]);

  if (error || !data) return {};

  const result: Record<string, string> = {};
  for (const row of data as Array<{ content_key?: string | null; published_value?: string | null }>) {
    const key = row.content_key?.trim();
    const value = row.published_value?.trim();
    if (key && value) result[key] = value;
  }
  return result;
}

export function contentValue(
  published: Readonly<Record<string, string>>,
  key: string,
  fallback: string,
): string {
  const value = published[key]?.trim();
  return value || fallback;
}
