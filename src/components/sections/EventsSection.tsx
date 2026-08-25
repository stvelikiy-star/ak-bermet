import SectionHeading from "@/components/ui/SectionHeading";
import { halls, equipmentNote, coffeeBreak, eventsIntro } from "@/data/events";
import { WA } from "@/data/site";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import {
  IconUsers,
  IconProjector,
  IconCoffee,
  IconArrowRight,
} from "@/components/ui/icons";

export default async function EventsSection() {
  const locale = await getLocale();
  return (
    <section id="events" className="bg-beige py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("Деловые и праздничные события", locale)}
          title={t("Корпоративы и мероприятия", locale)}
          subtitle={t(eventsIntro.subtitle, locale)}
          className="mb-8"
        />
        <p className="mx-auto mb-12 max-w-3xl text-center text-sm leading-relaxed text-muted">
          {t(eventsIntro.text, locale)}
        </p>

        {/* Конференц-залы */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {halls.map((h) => (
            <div
              key={h.capacity}
              className="flex flex-col rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
                <IconUsers className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-semibold text-emerald-deep">
                {t(h.capacity, locale)}
              </h3>
              <div className="mt-3 space-y-1.5 border-t border-gold/15 pt-3 text-sm text-muted">
                <p>
                  <span className="font-semibold text-emerald-deep">
                    {t(h.fullDay, locale)}
                  </span>
                </p>
                <p>{t(h.halfDay, locale)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Оборудование и кофе-брейк */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft">
            <IconProjector className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
            <p className="text-sm leading-relaxed text-muted">{t(equipmentNote, locale)}</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft">
            <IconCoffee className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
            <p className="text-sm leading-relaxed text-muted">{t(coffeeBreak, locale)}</p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <a
            href={WA.events}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-3.5 text-sm font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
          >
            {t("Запросить условия для мероприятия", locale)}{" "}
            <IconArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
