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
    "Обзор номеров AK BERMET на Иссык-Куле: Garden Lux, люксы, полулюксы, стандарты и коттеджи. Корпус, вместимость, Wi-Fi, питание и условия.",
  alternates: { canonical: "/rooms" },
};

export default function RoomsPage() {
  return (
    <main>
      <PageHero
        badge="Размещение"
        title="Номера и коттеджи Ак-Бермет"
        subtitle="Сначала изучите варианты проживания: Garden Lux, люксы, полулюксы, стандарты и коттеджи. Откройте «Подробнее», чтобы увидеть фото, условия и удобства, — а наличие уточните в WhatsApp."
        image="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=2000&q=80"
      />

      {/* Карточки типов номеров → detail pages */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Категории"
            title="Варианты проживания"
            subtitle="Нажмите «Подробнее», чтобы изучить корпус, удобства и условия. «Узнать наличие» — это уже обращение к администратору."
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
                    alt={card.alt}
                    className="aspect-[4/3] w-full"
                    imgClassName="group-hover:scale-105"
                  />
                  {card.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-gradient-to-b from-gold-soft to-gold px-3 py-1 text-[11px] font-semibold text-emerald-deep shadow-gold">
                      {card.badge}
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-semibold text-emerald-deep">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gold-dark">
                    {card.building}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {card.short}
                  </p>

                  {/* Быстрые факты */}
                  <ul className="mt-4 flex flex-wrap gap-2 text-[12px]">
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconUsers className="h-3.5 w-3.5 text-gold-dark" />
                      {card.capacity}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconWifi className="h-3.5 w-3.5 text-gold-dark" />
                      {card.wifi ? "Wi-Fi есть" : "Без Wi-Fi"}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/5 px-2.5 py-1 text-emerald-deep">
                      <IconDish className="h-3.5 w-3.5 text-gold-dark" />
                      Питание включено
                    </li>
                  </ul>

                  {/* CTA: Подробнее (первично) + Узнать наличие (вторично) */}
                  <div className="mt-5 flex flex-col gap-2.5">
                    <Link
                      href={`/rooms/${card.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-deep px-5 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
                    >
                      Подробнее <IconArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href={WA[card.slug === "garden-lux" ? "garden" : "availability"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
                    >
                      <WhatsAppIcon size={18} className="shrink-0" />
                      Узнать наличие
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Что выбрать */}
      <section className="bg-beige py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Подбор под гостя"
            title="Что выбрать?"
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
                    {a.type}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {a.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Важные заметки */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
            <h3 className="mb-5 flex items-center gap-2.5 font-display text-xl font-semibold text-emerald-deep">
              <IconShield className="h-6 w-6 text-gold-dark" />
              Важно знать
            </h3>
            <ul className="space-y-3">
              {roomsNotes.map((n) => (
                <li
                  key={n}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Форма заявки */}
      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <BookingLeadForm interest="rooms" anchorId="booking-form" />
        </Container>
      </section>

      <PageCTA
        title="Подобрать номер"
        text="Напишите нам в WhatsApp — администратор проверит наличие и подберёт подходящий вариант под ваши даты и количество гостей."
        cta={{ label: "Узнать наличие номеров", href: WA.availability }}
      />
    </main>
  );
}
