import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import GeneralLeadForm from "@/components/forms/GeneralLeadForm";
import { SITE, WA } from "@/data/site";
import {
  IconPin,

  IconMail,
  IconPhone,
  IconArrowRight,
} from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Контакты комплекса AK BERMET на Иссык-Куле: адрес, WhatsApp, телефон по источникам, карта 2GIS и как добраться.",
};

export default function ContactsPage() {
  return (
    <main>
      <PageHero
        badge="Контакты"
        title="Контакты Ак-Бермет"
        subtitle="Свяжитесь с нами для бронирования, вопросов по источникам, SPA и мероприятиям."
        image="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80"
        cta={{ label: "Написать в WhatsApp", href: WA.booking }}
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Реквизиты + как добраться */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft sm:p-8">
                <h2 className="mb-5 font-display text-xl font-semibold text-emerald-deep">
                  Реквизиты
                </h2>
                <ul className="space-y-5 text-sm">
                  <li className="flex items-start gap-3">
                    <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
                    <span className="leading-relaxed text-ink/80">
                      {SITE.address}
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <WhatsAppIcon size={20} className="shrink-0 shrink-0 text-gold-dark" />
                    <a
                      href={`tel:+${SITE.phoneRaw}`}
                      className="text-ink/80 hover:text-emerald-deep"
                    >
                      {SITE.phoneDisplay}{" "}
                      <span className="text-xs text-muted">(WhatsApp)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <IconPhone className="h-5 w-5 shrink-0 text-gold-dark" />
                    <a
                      href={`tel:+${SITE.springsPhoneRaw}`}
                      className="text-ink/80 hover:text-emerald-deep"
                    >
                      {SITE.springsPhoneDisplay}{" "}
                      <span className="text-xs text-muted">(источники)</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <IconMail className="h-5 w-5 shrink-0 text-gold-dark" />
                    <a
                      href={`mailto:${SITE.email}`}
                      className="text-ink/80 hover:text-emerald-deep"
                    >
                      {SITE.email}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft sm:p-8">
                <h2 className="mb-3 font-display text-xl font-semibold text-emerald-deep">
                  Как добраться
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  {SITE.directions}
                </p>
                <ul className="mt-4 space-y-2">
                  {SITE.distances.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2.5 text-sm text-emerald-deep"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA + карта */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={WA.booking}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-3.5 text-sm font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
                >
                  <WhatsAppIcon size={16} className="shrink-0" />
                  Написать в WhatsApp
                </a>
                <a
                  href={WA.availability}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-milk px-5 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
                >
                  Узнать наличие
                </a>
              </div>

              <a
                href={SITE.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-gold/15 shadow-soft"
              >
                <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-teal-700 via-emerald-800 to-emerald-deep p-10">
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)",
                      backgroundSize: "26px 26px",
                    }}
                    aria-hidden
                  />
                  <span className="relative flex items-center gap-2 font-display text-lg font-semibold text-gold-soft">
                    <IconPin className="h-5 w-5" /> Ак-Бермет на карте
                  </span>
                </div>
                <span className="flex items-center justify-center gap-1.5 bg-milk py-3 text-sm font-semibold text-emerald-deep transition-colors group-hover:text-gold-dark">
                  Открыть 2ГИС <IconArrowRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Форма вопроса */}
      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <GeneralLeadForm anchorId="general-form" />
        </Container>
      </section>

      <PageCTA
        title="Готовы помочь с бронированием"
        text="Напишите нам в WhatsApp — ответим на вопросы по номерам, источникам, SPA и мероприятиям."
        cta={{ label: "Написать в WhatsApp", href: WA.booking }}
      />
    </main>
  );
}
