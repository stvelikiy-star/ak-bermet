import Link from "next/link";
﻿import { WA } from "@/data/site";
import { heroFacts } from "@/data/home";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import { contentValue, loadPublishedSiteContent } from "@/lib/site-content";
import { IconEye } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

const HERO_CONTENT_KEYS = [
  "home.hero.eyebrow",
  "home.hero.title_prefix",
  "home.hero.title_suffix",
  "home.hero.description",
  "home.hero.cta_booking",
  "home.hero.cta_rooms",
] as const;

export default async function HeroSection() {
  const locale = await getLocale();
  const published = await loadPublishedSiteContent(locale, HERO_CONTENT_KEYS);

  return (
    <section id="top" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-emerald-deep bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero/home-hero.png')" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-deep/95 via-emerald-deep/70 to-emerald-deep/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep via-transparent to-emerald-deep/40" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-site flex-col justify-center px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-emerald-deep/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft backdrop-blur">
            {contentValue(published, "home.hero.eyebrow", t("SPA & Wellness", locale))}
          </p>

          <h1 className="font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            {contentValue(published, "home.hero.title_prefix", t("Ак-Бермет — отдых,", locale))}{" "}
            <span className="text-gold-soft">SPA</span>{" "}
            {contentValue(
              published,
              "home.hero.title_suffix",
              t("и горячие источники на Иссык-Куле", locale),
            )}
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {contentValue(
              published,
              "home.hero.description",
              t(
                "Оздоровительный комплекс с горячими минеральными источниками, SPA, номерами, коттеджами, трёхразовым питанием и мероприятиями рядом с Чолпон-Атой.",
                locale,
              ),
            )}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={WA.booking}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-4 text-sm font-semibold uppercase tracking-wide text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              {contentValue(published, "home.hero.cta_booking", t("Забронировать отдых", locale))}
            </a>
            <Link
              href="/rooms"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/5 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white backdrop-blur transition-colors hover:border-gold/60 hover:text-gold-soft"
            >
              <IconEye className="h-5 w-5" />
              {contentValue(published, "home.hero.cta_rooms", t("Посмотреть номера", locale))}
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-8 sm:mt-16 lg:grid-cols-4">
          {heroFacts.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold-soft">
                <f.icon className="h-5 w-5" />
              </span>
              <span className="text-[13px] font-medium leading-tight text-white/85">
                {t(f.label, locale)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
