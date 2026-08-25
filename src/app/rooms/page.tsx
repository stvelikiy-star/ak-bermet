import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import BookingLeadForm from "@/components/forms/BookingLeadForm";
import Photo from "@/components/ui/Photo";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { WA } from "@/data/site";
import { accommodationByType, roomsNotes } from "@/data/rooms";
import { roomOverviewCards } from "@/data/room-details";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";
import {
  IconUsers,
  IconShield,
  IconWifi,
  IconDish,
  IconArrowRight,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Номера и коттеджи",
  description:
    "Подтверждённый номерной фонд AK BERMET 2026: Garden Rooms, люксы, полулюксы, стандарты, семейные номера, коттеджи и срубы.",
  alternates: { canonical: "/rooms" },
};

export default async function RoomsPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("Размещение", locale)}
        title={t("Номера и коттеджи Ак-Бермет", locale)}
        subtitle={t("Каталог синхронизирован с первичным реестром 2026. Используются только подтверждённые фотографии AK BERMET; наличие и конкретный номер подтверждает администратор.", locale)}
        image="/images/hero/rooms-hero.png"
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Категории", locale)}
            title={t("Варианты проживания", locale)}
            subtitle={t("Нажмите «Подробнее», чтобы увидеть подтверждённые количества, вместимость и ограничения. «Узнать наличие» — обращение к администратору.", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roomOverviewCards.map((card) => (
              <article
                key={card.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gold/15 bg-milk shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <Link href={`/rooms/${card.slug}`} className="relative block">
                  <Photo
                    src={card.img}
                    alt={t(card.alt, locale)}
                    className="aspect-[4/3] w-full"
                    imgClassName="group-hover:scale-105"
                  />
                  {card.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-gradient-to-b from-gold-soft to-gold px-3 py-1 text-[11px] font-semibold text-emerald-deep shadow-gold">
                      {t(card.badge, locale)}
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-semibold text-emerald-deep">
                    {t(card.title, locale)}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gold-dark">
                    {t(card.building, locale)}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {t(card.short, locale)}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-2 text-[12px]">
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconUsers className="h-3.5 w-3.5 text-gold-dark" />
                      {t(card.capacity, locale)}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconWifi className="h-3.5 w-3.5 text-gold-dark" />
                      {card.wifi === true
                        ? t("Wi-Fi есть", locale)
                        : card.wifi === false
                          ? t("Без Wi-Fi", locale)
                          : t("Wi-Fi уточнить", locale)}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconDish className="h-3.5 w-3.5 text-gold-dark" />
                      {t("Питание по тарифу", locale)}
                    </li>
                  </ul>

                  <div className="mt-5 flex flex-col gap-2.5">
                    <Link
                      href={`/rooms/${card.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-deep px-5 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
                    >
                      {t("Подробнее", locale)} <IconArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href={WA[card.slug === "garden-lux" ? "garden" : "availability"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
                    >
                      <WhatsAppIcon size={18} className="shrink-0" />
                      {t("Узнать наличие", locale)}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Подбор под гостя", locale)}
            title={t("Что выбрать?", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accommodationByType.map((a) => (
              <div
                key={a.type}
                className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
                  <IconUsers className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-emerald-deep">
                    {t(a.type, locale)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {t(a.text, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
            <h3 className="mb-5 flex items-center gap-2.5 font-display text-xl font-semibold text-emerald-deep">
              <IconShield className="h-6 w-6 text-gold-dark" />
              {t("Важно знать", locale)}
            </h3>
            <ul className="space-y-3">
              {roomsNotes.map((n) => (
                <li
                  key={n}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {t(n, locale)}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <BookingLeadForm interest="rooms" anchorId="booking-form" />
        </Container>
      </section>

      <PageCTA
        title={t("Подобрать номер", locale)}
        text={t("Напишите нам в WhatsApp — администратор проверит наличие, конкретный номер и применимый тариф под ваши даты и количество гостей.", locale)}
        cta={{ label: t("Узнать наличие номеров", locale), href: WA.availability }}
      />
    </main>
  );
}
