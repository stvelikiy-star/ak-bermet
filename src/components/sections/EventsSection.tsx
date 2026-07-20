import SectionHeading from "@/components/ui/SectionHeading";
import { halls, equipmentNote, coffeeBreak, eventsIntro } from "@/data/events";
import { WA } from "@/data/site";
import {
  IconUsers,
  IconProjector,
  IconCoffee,
  IconArrowRight,
} from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export default function EventsSection() {
  return (
    <section id="events" className="bg-beige py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Деловые и праздничные события"
          title="Корпоративы и мероприятия"
          subtitle={eventsIntro.subtitle}
          className="mb-8"
        />
        <p className="mx-auto mb-12 max-w-3xl text-center text-sm leading-relaxed text-muted">
          {eventsIntro.text}
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
                {h.capacity}
              </h3>
              <div className="mt-3 space-y-1.5 border-t border-gold/15 pt-3 text-sm text-muted">
                <p>
                  <span className="font-semibold text-emerald-deep">
                    {h.fullDay}
                  </span>
                </p>
                <p>{h.halfDay}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Оборудование и кофе-брейк */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft">
            <IconProjector className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
            <p className="text-sm leading-relaxed text-muted">{equipmentNote}</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft">
            <IconCoffee className="mt-0.5 h-6 w-6 shrink-0 text-gold-dark" />
            <p className="text-sm leading-relaxed text-muted">{coffeeBreak}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/events"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-3.5 text-sm font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
          >
            Подробнее для компаний <IconArrowRight className="h-4 w-4" />
          </a>
          <a
            href={WA.events}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-milk px-7 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            <WhatsAppIcon size={18} className="shrink-0" />
            Рассчитать мероприятие
          </a>
        </div>
      </div>
    </section>
  );
}
