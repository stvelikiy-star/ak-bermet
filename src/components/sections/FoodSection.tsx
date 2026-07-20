import SectionHeading from "@/components/ui/SectionHeading";
import { foodIntro, schedule, venues } from "@/data/food";
import { WA } from "@/data/site";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { IconClock, IconDish, IconArrowRight } from "@/components/ui/icons";

export default function FoodSection() {
  return (
    <section id="food" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Гастрономия"
          title="Питание и рестораны"
          subtitle={foodIntro}
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Расписание */}
          <div className="lg:col-span-4">
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
                    <span className="font-medium text-gold-dark">{s.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Заведения */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
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
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/food"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-3.5 text-sm font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
          >
            Подробнее о питании <IconArrowRight className="h-4 w-4" />
          </a>
          <a
            href={WA.food}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-milk px-7 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            <WhatsAppIcon size={18} className="shrink-0" />
            Уточнить меню
          </a>
        </div>
      </div>
    </section>
  );
}
