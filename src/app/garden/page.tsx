import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import BookingLeadForm from "@/components/forms/BookingLeadForm";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Photo from "@/components/ui/Photo";
import { WA } from "@/data/site";
import { garden, gardenIncluded, gardenBestFor } from "@/data/rooms";
import {
  IconLeaf,
  IconBed2,
  IconWifi,
  IconDesk,
  IconBed,
  IconDish,
  IconCheck,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/garden" },
  title: "Garden Rooms 2026",
  description:
    "Новые премиальные корпуса Garden 1 и Garden 2 на Иссык-Куле: современная мебель, Wi-Fi, рабочие зоны и трёхразовое питание.",
};

const featureItems = [
  { icon: IconLeaf, label: "Новые корпуса 2026" },
  { icon: IconBed2, label: "Современная мебель" },
  { icon: IconBed, label: "Двуспальные кровати" },
  { icon: IconDesk, label: "Рабочие зоны" },
  { icon: IconWifi, label: "Стабильный Wi-Fi" },
  { icon: IconDish, label: "Трёхразовое питание" },
];

export default function GardenPage() {
  return (
    <main>
      <PageHero
        badge="Новинка 2026"
        title="Garden Rooms 2026"
        subtitle="Новые премиальные корпуса Garden 1 и Garden 2 для комфортного отдыха на Иссык-Куле."
        image="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Узнать наличие Garden Rooms", href: WA.garden }}
      />

      {/* Premium intro */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-emerald-deep to-emerald-900 shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <span className="mb-4 w-fit rounded-full bg-gradient-to-b from-gold-soft to-gold px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep">
                  {garden.badge}
                </span>
                <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                  Премиальные корпуса нового сезона
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                  {garden.text}
                </p>
              </div>
              <Photo
                src={garden.img}
                alt={garden.alt}
                className="min-h-[260px] w-full lg:min-h-full"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Feature grid */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Преимущества"
            title="Что делает Garden особенным"
            className="mb-12"
          />
          <FeatureGrid features={featureItems} columns={3} />
        </Container>
      </section>

      {/* Что входит + кому подойдёт */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft sm:p-8">
              <h3 className="mb-5 font-display text-xl font-semibold text-emerald-deep">
                Что входит
              </h3>
              <ul className="space-y-3">
                {gardenIncluded.map((g) => (
                  <li
                    key={g}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft sm:p-8">
              <h3 className="mb-5 font-display text-xl font-semibold text-emerald-deep">
                Кому подойдёт
              </h3>
              <ul className="space-y-3">
                {gardenBestFor.map((g) => (
                  <li
                    key={g}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Форма заявки (предвыбран Garden люкс) */}
      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <BookingLeadForm
            interest="garden"
            defaultCategory="Garden люкс"
            anchorId="booking-form"
            title="Заявка на Garden Rooms"
          />
        </Container>
      </section>

      <PageCTA
        title="Забронировать Garden Rooms"
        text="Количество новых номеров ограничено. Напишите нам — администратор подтвердит наличие на ваши даты."
        cta={{ label: "Узнать наличие Garden Rooms", href: WA.garden }}
      />
    </main>
  );
}
