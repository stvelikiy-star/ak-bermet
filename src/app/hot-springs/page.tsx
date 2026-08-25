import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import Photo from "@/components/ui/Photo";
import SpaLeadForm from "@/components/forms/SpaLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { SITE, WA } from "@/data/site";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";
import {
  springsFacts,
  wellInfo,
  springsPricing,
  springsRules,
} from "@/data/wellness";
import {
  IconCheck,
  IconDrop,
  IconShield,
  IconPhone,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/hot-springs" },
  title: "Горячие источники",
  description:
    "Круглогодичные горячие минеральные источники Ак-Бермет на Иссык-Куле: бассейны, цены и условия посещения.",
};


const springsGallery = [
  { src: "/images/hot-springs/hot-springs-entrance-01.png", alt: "Горячие источники AK BERMET" },
  { src: "/images/hot-springs/hot-springs-entrance-02.png", alt: "Горячие источники AK BERMET" },
  { src: "/images/hot-springs/hot-springs-outdoor-pool-01.png", alt: "Термальный бассейн AK BERMET" },
  { src: "/images/hot-springs/hot-springs-outdoor-pool-02.png", alt: "Термальный бассейн AK BERMET" },
  { src: "/images/hot-springs/hot-springs-outdoor-pool-03.png", alt: "Термальный бассейн AK BERMET" },
];

export default async function HotSpringsPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("Термальный комплекс", locale)}
        title={t("Горячие источники Ак-Бермет", locale)}
        subtitle={t("Круглогодичный термальный комплекс с минеральной хлоридно-натриевой водой, 7 бассейнами и температурой воды до +44 °C.", locale)}
        image="/images/hot-springs/hot-springs-main.png"
        cta={{ label: t("Уточнить посещение источников", locale), href: WA.springs }}
      />

      {/* Факты */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("О комплексе", locale)}
            title={t("Что важно знать", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {springsFacts.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-4 shadow-soft sm:p-5"
              >
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
                <span className="text-sm font-medium text-emerald-deep">
                  {t(f, locale)}
                </span>
              </div>
            ))}
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
            {springsGallery.map((photo) => (
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

      {/* Скважина */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
              <IconDrop className="h-6 w-6" />
            </span>
            <div>
              <h3 className="mb-2 font-display text-lg font-semibold text-emerald-deep">
                {t("Минеральная вода", locale)}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{t(wellInfo, locale)}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Цены и правила */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PriceCard
              title={t("Стоимость посещения", locale)}
              icon={IconDrop}
              rows={springsPricing.map((r) => ({ label: t(r.label, locale), price: t(r.price, locale) }))}
              note={t("Гости без проживания могут посещать источники платно, предварительная запись не требуется.", locale)}
            />
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
                <IconShield className="h-5 w-5 text-gold-dark" />
                {t("Правила посещения", locale)}
              </h3>
              <ul className="space-y-3">
                {springsRules.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {t(r, locale)}
                  </li>
                ))}
              </ul>
              <a
                href={`tel:+${SITE.springsPhoneRaw}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-cream px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
              >
                <IconPhone className="h-4 w-4" />
                {SITE.springsPhoneDisplay}
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Форма заявки */}
      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <SpaLeadForm
            interest="hot_springs"
            defaultService="Горячие источники"
            anchorId="springs-form"
          />
        </Container>
      </section>

      <PageCTA
        title={t("Запланировать визит", locale)}
        text={t("Напишите нам, чтобы уточнить часы работы и условия посещения горячих источников.", locale)}
        cta={{ label: t("Уточнить посещение источников", locale), href: WA.springs }}
      />
    </main>
  );
}
