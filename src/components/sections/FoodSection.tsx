import SectionHeading from "@/components/ui/SectionHeading";
import { foodIntro, schedule, venues } from "@/data/food";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import { IconClock, IconDish } from "@/components/ui/icons";

export default async function FoodSection() {
  const locale = await getLocale();
  return (
    <section id="food" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("Гастрономия", locale)}
          title={t("Питание и рестораны", locale)}
          subtitle={t(foodIntro, locale)}
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Расписание */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-emerald-deep">
                <IconClock className="h-5 w-5 text-gold-dark" />
                {t("Расписание питания", locale)}
              </h3>
              <ul className="divide-y divide-gold/10">
                {schedule.map((s) => (
                  <li
                    key={s.meal}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-emerald-deep">{t(s.meal, locale)}</span>
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
                    {t(v.name, locale)}
                  </h4>
                  <p className="mt-1 text-sm text-muted">{t(v.cuisine, locale)}</p>
                  <p className="mt-1 text-xs font-medium text-gold-dark">
                    {v.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
