import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import Photo from "@/components/ui/Photo";
import EventLeadForm from "@/components/forms/EventLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { WA } from "@/data/site";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import {
  halls,
  suitableFor,
  equipmentList,
  coffeeBreak,
  corporatePackage,
  hallsTimeNote,
} from "@/data/events";
import {
  IconUsers,
  IconProjector,
  IconCoffee,
  IconCheck,
  IconGift,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/events" },
  title: "Корпоративы и конференц-залы",
  description:
    "Конференц-залы, проживание, питание, кофе-брейки и SPA для корпоративов, семинаров и тренингов на Иссык-Куле.",
};


const eventsGallery = [
  { src: "/images/events/conference-hall-big-01.png", alt: "Большой конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-big-03.png", alt: "Большой конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-big-04.png", alt: "Большой конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-big-05.png", alt: "Большой конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-big-07.png", alt: "Большой конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-25p-01.png", alt: "Конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-25p-02.png", alt: "Конференц-зал AK BERMET" },
  { src: "/images/events/conference-hall-25p-03.png", alt: "Конференц-зал AK BERMET" },
  { src: "/images/events/conference-room-small-01.png", alt: "Переговорный зал AK BERMET" },
  { src: "/images/events/conference-room-small-02.png", alt: "Переговорный зал AK BERMET" },
];

export default async function EventsPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("Деловые события", locale)}
        title={t("Корпоративы и мероприятия на Иссык-Куле", locale)}
        subtitle={t("Конференц-залы, проживание, питание, кофе-брейки, SPA и горячие источники в одном комплексе.", locale)}
        image="/images/events/conference-hall-big-02.png"
        cta={{ label: t("Рассчитать мероприятие", locale), href: WA.events }}
      />

      {/* Кому подходит */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Форматы", locale)}
            title={t("Подходит для", locale)}
            subtitle={t("Комплекс хорошо подходит для зимнего сезона и корпоративных клиентов.", locale)}
            className="mb-12"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {suitableFor.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-milk px-4 py-2 text-sm font-medium text-emerald-deep shadow-soft"
              >
                <IconCheck className="h-4 w-4 text-gold-dark" />
                {t(s, locale)}
              </span>
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
            {eventsGallery.map((photo) => (
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

      {/* Залы и цены */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("Конференц-залы", locale)}
            title={t("Вместимость и стоимость", locale)}
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {halls.map((h, i) => (
              <PriceCard
                key={h.capacity}
                title={t(h.capacity, locale)}
                icon={IconUsers}
                rows={[
                  { label: t("Полный день", locale), price: t(h.fullDay, locale) },
                  { label: t("Полдня", locale), price: t(h.halfDay, locale) },
                ]}
                note={i === 0 ? t(hallsTimeNote, locale) : undefined}
                highlight={i === halls.length - 1}
              />
            ))}
          </div>

          {/* Оборудование и кофе-брейк */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
                <IconProjector className="h-5 w-5 text-gold-dark" />
                {t("Оборудование залов", locale)}
              </h3>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {equipmentList.map((e) => (
                  <li
                    key={e}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {t(e, locale)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <IconCoffee className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
              <div>
                <h3 className="mb-1 font-display text-lg font-semibold text-emerald-deep">
                  {t("Кофе-брейк", locale)}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {t(coffeeBreak, locale)}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Корпоративный пакет */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-emerald-deep to-emerald-900 p-7 shadow-card sm:p-9">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep">
              <IconGift className="h-6 w-6" />
            </span>
            <div>
              <h3 className="mb-2 font-display text-xl font-semibold text-white">
                {t("Пакет под ключ", locale)}
              </h3>
              <p className="text-sm leading-relaxed text-white/75">
                {t(corporatePackage, locale)}
              </p>
            </div>
          </div>
        </Container>
      </section>


      {/* Форма заявки */}
      <section className="bg-cream py-16 sm:py-24">
        <Container className="max-w-3xl">
          <EventLeadForm anchorId="event-form" />
        </Container>
      </section>

      <PageCTA
        title={t("Организуем ваше мероприятие", locale)}
        text={t("Расскажите про формат, даты и число участников — подготовим условия по залам, проживанию и питанию.", locale)}
        cta={{ label: t("Рассчитать мероприятие", locale), href: WA.events }}
      />
    </main>
  );
}
