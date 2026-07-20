import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import EventLeadForm from "@/components/forms/EventLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { WA } from "@/data/site";
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

export default function EventsPage() {
  return (
    <main>
      <PageHero
        badge="Деловые события"
        title="Корпоративы и мероприятия на Иссык-Куле"
        subtitle="Конференц-залы, проживание, питание, кофе-брейки, SPA и горячие источники в одном комплексе."
        image="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Рассчитать мероприятие", href: WA.events }}
      />

      {/* Кому подходит */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Форматы"
            title="Подходит для"
            subtitle="Комплекс хорошо подходит для зимнего сезона и корпоративных клиентов."
            className="mb-12"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {suitableFor.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-milk px-4 py-2 text-sm font-medium text-emerald-deep shadow-soft"
              >
                <IconCheck className="h-4 w-4 text-gold-dark" />
                {s}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Залы и цены */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Конференц-залы"
            title="Вместимость и стоимость"
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {halls.map((h, i) => (
              <PriceCard
                key={h.capacity}
                title={h.capacity}
                icon={IconUsers}
                rows={[
                  { label: "Полный день", price: h.fullDay },
                  { label: "Полдня", price: h.halfDay },
                ]}
                note={i === 0 ? hallsTimeNote : undefined}
                highlight={i === halls.length - 1}
              />
            ))}
          </div>

          {/* Оборудование и кофе-брейк */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
                <IconProjector className="h-5 w-5 text-gold-dark" />
                Оборудование залов
              </h3>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {equipmentList.map((e) => (
                  <li
                    key={e}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <IconCoffee className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
              <div>
                <h3 className="mb-1 font-display text-lg font-semibold text-emerald-deep">
                  Кофе-брейк
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {coffeeBreak}
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
                Пакет под ключ
              </h3>
              <p className="text-sm leading-relaxed text-white/75">
                {corporatePackage}
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
        title="Организуем ваше мероприятие"
        text="Расскажите про формат, даты и число участников — подготовим условия по залам, проживанию и питанию."
        cta={{ label: "Рассчитать мероприятие", href: WA.events }}
      />
    </main>
  );
}
