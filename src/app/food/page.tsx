import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import Photo from "@/components/ui/Photo";
import {
  includedFood,
  schedule,
  menuHighlights,
  venues,
} from "@/data/food";
import { WA } from "@/data/site";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";
import { IconClock, IconDish, IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/food" },
  title: "Питание и рестораны",
  description:
    "Трёхразовое комплексное питание для проживающих гостей и кафе на территории комплекса AK BERMET на Иссык-Куле.",
};


const foodGallery = [
  { src: "/images/food/gallery-01-dining-hall-main.webp.png", alt: "AK BERMET — обеденный зал" },
  { src: "/images/food/gallery-02-dining-hall-wide-angle.webp.png", alt: "AK BERMET — обеденный зал" },
  { src: "/images/food/gallery-02-dining-hall-second-angle.webp.png", alt: "AK BERMET — обеденный зал" },
  { src: "/images/food/gallery-03-table-setting.webp.png", alt: "AK BERMET — сервировка" },
  { src: "/images/food/gallery-05-dining-hall-second-angle.webp.png", alt: "AK BERMET — питание" },
  { src: "/images/food/gallery-06-dining-hall-interior-details.webp.png", alt: "AK BERMET — интерьер обеденного зала" },
];

export default async function FoodPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("Гастрономия", locale)}
        title={t("Питание и рестораны", locale)}
        subtitle={t("Трёхразовое комплексное питание для проживающих гостей и кафе на территории комплекса.", locale)}
        image="/images/hero/food-hero.png"
        cta={{ label: t("Уточнить меню", locale), href: WA.food }}
      />

      {/* Включённое питание + расписание */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
                {t("Включено в проживание", locale)}
              </p>
              <h2 className="font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
                {t("Трёхразовое питание", locale)}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                {t(includedFood, locale)}
              </p>

              <h3 className="mt-8 mb-3 font-display text-lg font-semibold text-emerald-deep">
                {t("Из чего обычно состоит меню", locale)}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {menuHighlights.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-milk px-3.5 py-1.5 text-sm text-emerald-deep shadow-soft"
                  >
                    <IconCheck className="h-3.5 w-3.5 text-gold-dark" />
                    {t(m, locale)}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-emerald-deep">
                  <IconClock className="h-5 w-5 text-gold-dark" />
                  {t("Расписание питания", locale)}
                </h3>
                <ul className="divide-y divide-gold/10">
                  {schedule.map((s) => (
                    <li
                      key={s.meal}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-emerald-deep">{t(s.meal, locale)}</span>
                      <span className="font-medium text-gold-dark">
                        {s.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
            {foodGallery.map((photo) => (
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

      {/* Заведения */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("На территории", locale)}
            title={t("Кафе и рестораны", locale)}
            subtitle={t("Доступны в том числе для гостей без проживания.", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {venues.map((v) => (
              <div
                key={v.name}
                className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
                  <IconDish className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-display text-base font-semibold text-emerald-deep">
                    {t(v.name, locale)}
                  </h4>
                  <p className="mt-1 text-sm text-muted">{t(v.cuisine, locale)}</p>
                  <p className="mt-1 text-xs font-medium text-gold-dark">
                    {v.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <PageCTA
        title={t("Вопросы по питанию?", locale)}
        text={t("Напишите нам — расскажем про меню, режим питания и возможности для гостей без проживания.", locale)}
        cta={{ label: t("Уточнить меню", locale), href: WA.food }}
      />
    </main>
  );
}
