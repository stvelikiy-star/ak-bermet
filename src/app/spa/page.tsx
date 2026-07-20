import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import SpaLeadForm from "@/components/forms/SpaLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { WA } from "@/data/site";
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

export default function SpaPage() {
  return (
    <main>
      <PageHero
        badge="SPA & Wellness"
        title="SPA & Wellness"
        subtitle="Бассейн, тренажёрный зал, источники и wellness-формат для восстановления и отдыха."
        image="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Уточнить услуги SPA", href: WA.spa }}
      />

      {/* Что входит для проживающих */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Для проживающих гостей"
            title="Что входит в проживание"
            subtitle="Утренний доступ к wellness-зоне для гостей, проживающих в комплексе."
            className="mb-12"
          />
          <div className="mx-auto max-w-2xl">
            <PriceCard
              title="Доступ для проживающих"
              icon={IconClock}
              rows={spaIncluded}
              note="Утренний доступ предоставляется проживающим гостям."
            />
          </div>
        </Container>
      </section>

      {/* Прайс */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Стоимость"
            title="Бассейн и тренажёрный зал"
            className="mb-12"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PriceCard
              title="Бассейн + источники"
              icon={IconPool}
              rows={poolPricing}
            />
            <PriceCard
              title="Тренажёрный зал + бассейн"
              icon={IconDumbbell}
              rows={gymPoolPricing}
              highlight
            />
          </div>

          {/* Правила */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
              <IconShield className="h-5 w-5 text-gold-dark" />
              Важные правила
            </h3>
            <ul className="space-y-3">
              {spaRules.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {r}
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
        title="Записаться в SPA"
        text="Напишите нам в WhatsApp, чтобы уточнить расписание и записаться на посещение SPA & Wellness."
        cta={{ label: "Уточнить услуги SPA", href: WA.spa }}
      />
    </main>
  );
}
