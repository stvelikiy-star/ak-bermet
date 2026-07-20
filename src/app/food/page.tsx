import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import {
  includedFood,
  schedule,
  menuHighlights,
  venues,
} from "@/data/food";
import { WA } from "@/data/site";
import { IconClock, IconDish, IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/food" },
  title: "Питание и рестораны",
  description:
    "Трёхразовое комплексное питание для проживающих гостей и кафе на территории комплекса AK BERMET на Иссык-Куле.",
};

export default function FoodPage() {
  return (
    <main>
      <PageHero
        badge="Гастрономия"
        title="Питание и рестораны"
        subtitle="Трёхразовое комплексное питание для проживающих гостей и кафе на территории комплекса."
        image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Уточнить меню", href: WA.food }}
      />

      {/* Включённое питание + расписание */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
                Включено в проживание
              </p>
              <h2 className="font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
                Трёхразовое питание
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                {includedFood}
              </p>

              <h3 className="mt-8 mb-3 font-display text-lg font-semibold text-emerald-deep">
                Из чего обычно состоит меню
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {menuHighlights.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-milk px-3.5 py-1.5 text-sm text-emerald-deep shadow-soft"
                  >
                    <IconCheck className="h-3.5 w-3.5 text-gold-dark" />
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-emerald-deep">
                  <IconClock className="h-5 w-5 text-gold-dark" />
                  Расписание питания
                </h3>
                <ul className="divide-y divide-gold/10">
                  {schedule.map((s) => (
                    <li
                      key={s.meal}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-emerald-deep">{s.meal}</span>
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

      {/* Заведения */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="На территории"
            title="Кафе и рестораны"
            subtitle="Доступны в том числе для гостей без проживания."
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
                    {v.name}
                  </h4>
                  <p className="mt-1 text-sm text-muted">{v.cuisine}</p>
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
        title="Вопросы по питанию?"
        text="Напишите нам — расскажем про меню, режим питания и возможности для гостей без проживания."
        cta={{ label: "Уточнить меню", href: WA.food }}
      />
    </main>
  );
}
