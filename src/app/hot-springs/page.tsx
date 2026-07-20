import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import SpaLeadForm from "@/components/forms/SpaLeadForm";
import PriceCard from "@/components/ui/PriceCard";
import { SITE, WA } from "@/data/site";
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

export default function HotSpringsPage() {
  return (
    <main>
      <PageHero
        badge="Термальный комплекс"
        title="Горячие источники Ак-Бермет"
        subtitle="Круглогодичный термальный комплекс с минеральной хлоридно-натриевой водой, 7 бассейнами и температурой воды до +44 °C."
        image="https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Уточнить посещение источников", href: WA.springs }}
      />

      {/* Факты */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="О комплексе"
            title="Что важно знать"
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
                  {f}
                </span>
              </div>
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
                Минеральная вода
              </h3>
              <p className="text-sm leading-relaxed text-muted">{wellInfo}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Цены и правила */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PriceCard
              title="Стоимость посещения"
              icon={IconDrop}
              rows={springsPricing}
              note="Гости без проживания могут посещать источники платно, предварительная запись не требуется."
            />
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
                <IconShield className="h-5 w-5 text-gold-dark" />
                Правила посещения
              </h3>
              <ul className="space-y-3">
                {springsRules.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {r}
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
        title="Запланировать визит"
        text="Напишите нам, чтобы уточнить часы работы и условия посещения горячих источников."
        cta={{ label: "Уточнить посещение источников", href: WA.springs }}
      />
    </main>
  );
}
