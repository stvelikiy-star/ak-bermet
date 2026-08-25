import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import Photo from "@/components/ui/Photo";
import SpaLeadForm from "@/components/forms/SpaLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { WA } from "@/data/site";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";
import {
  spaIncluded,
  poolPricing,
  gymPoolPricing,
  spaRules,
} from "@/data/wellness";
import {
  IconClock,
  IconPool,
  IconDumbbell,
  IconShield,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/spa" },
  title: "SPA & Wellness",
  description:
    "Бассейн, тренажёрный зал, источники и wellness-программы в комплексе AK BERMET на Иссык-Куле. Цены и условия посещения.",
};


const spaGallery = [
  { src: "/images/spa/gallery-01-massage-room.webp.png", alt: "SPA AK BERMET — массажный кабинет" },
  { src: "/images/spa/gallery-02-spa-reception.webp.png", alt: "SPA AK BERMET — ресепшн" },
  { src: "/images/spa/gallery-03-spa-reception-second-angle.webp.png", alt: "SPA AK BERMET — ресепшн" },
  { src: "/images/spa/gallery-04-relax-lounge-tea.webp.png", alt: "SPA AK BERMET — зона отдыха" },
  { src: "/images/spa/gallery-05-sauna-main.webp.png", alt: "SPA AK BERMET — сауна" },
  { src: "/images/spa/gallery-06-sauna-second-angle.webp.png", alt: "SPA AK BERMET — сауна" },
  { src: "/images/spa/gallery-07-spa-consultation.webp.png", alt: "SPA AK BERMET — wellness" },
  { src: "/images/spa/gallery-08-spa-lounge.webp.png", alt: "SPA AK BERMET — лаунж" },
  { src: "/images/spa/gallery-09-sauna-relax-zone.webp.png", alt: "SPA AK BERMET — зона отдыха" },
  { src: "/images/spa/gallery-10-sauna-entrance.webp.png", alt: "SPA AK BERMET — вход в сауну" },
];

export default async function SpaPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("SPA & Wellness", locale)}
        title={t("SPA & Wellness", locale)}
        subtitle={t("Бассейн, тренажёрный зал, источники и wellness-формат для восстановления и отдыха.", locale)}
        image="/images/hero/spa-hero.png"
        cta={{ label: t("Уточнить услуги SPA", locale), href: WA.spa }}
      />

      {/* Что входит для проживающих */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Для проживающих гостей", locale)}
            title={t("Что входит в проживание", locale)}
            subtitle={t("Утренний доступ к wellness-зоне для гостей, проживающих в комплексе.", locale)}
            className="mb-12"
          />
          <div className="mx-auto max-w-2xl">
            <PriceCard
              title={t("Доступ для проживающих", locale)}
              icon={IconClock}
              rows={spaIncluded.map((r) => ({ label: t(r.label, locale), price: r.price }))}
              note={t("Утренний доступ предоставляется проживающим гостям.", locale)}
            />
          </div>
        </Container>
      </section>


      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Фотогалерея", locale)}
            title={t("Реальные фотографии AK BERMET", locale)}
            subtitle={t("Только подтверждённые фотографии комплекса.", locale)}
            className="mb-10"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaGallery.map((photo) => (
              <Photo
                key={photo.src}
                src={photo.src}
                alt={t(photo.alt, locale)}
                className="aspect-[4/3] w-full overflow-hidden rounded-2xl"
                imgClassName="transition-transform duration-500 hover:scale-105"
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Прайс */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Стоимость", locale)}
            title={t("Бассейн и тренажёрный зал", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PriceCard
              title={t("Бассейн + источники", locale)}
              icon={IconPool}
              rows={poolPricing.map((r) => ({ label: t(r.label, locale), price: t(r.price, locale) }))}
            />
            <PriceCard
              title={t("Тренажёрный зал + бассейн", locale)}
              icon={IconDumbbell}
              rows={gymPoolPricing.map((r) => ({ label: t(r.label, locale), price: t(r.price, locale) }))}
              highlight
            />
          </div>

          {/* Правила */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
              <IconShield className="h-5 w-5 text-gold-dark" />
              {t("Важные правила", locale)}
            </h3>
            <ul className="space-y-3">
              {spaRules.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {t(r, locale)}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Форма заявки */}
      <section className="bg-cream py-16 sm:py-24">
        <Container className="max-w-3xl">
          <SpaLeadForm interest="spa" defaultService="SPA" anchorId="spa-form" />
        </Container>
      </section>

      <PageCTA
        title={t("Записаться в SPA", locale)}
        text={t("Напишите нам в WhatsApp, чтобы уточнить расписание и записаться на посещение SPA & Wellness.", locale)}
        cta={{ label: t("Уточнить услуги SPA", locale), href: WA.spa }}
      />
    </main>
  );
}
