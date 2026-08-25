import Photo from "@/components/ui/Photo";
import { garden } from "@/data/rooms";
import { WA } from "@/data/site";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import {
  IconLeaf,
  IconBed2,
  IconWifi,
  IconDesk,
  IconBed,
  IconDish,
  IconArrowRight,
} from "@/components/ui/icons";

// Иконки в порядке garden.features
const featureIcons = [IconLeaf, IconBed2, IconWifi, IconDesk, IconBed, IconDish];

export default async function GardenSection() {
  const locale = await getLocale();
  return (
    <section id="garden" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-emerald-deep to-emerald-900 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <span className="mb-4 w-fit rounded-full bg-gradient-to-b from-gold-soft to-gold px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep shadow-gold">
                {t(garden.badge, locale)}
              </span>
              <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                {t(garden.title, locale)}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                {t(garden.text, locale)}
              </p>

              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {garden.features.map((f, i) => {
                  const Icon = featureIcons[i] ?? IconLeaf;
                  return (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/85"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-gold-soft" />
                      {t(f, locale)}
                    </li>
                  );
                })}
              </ul>

              <a
                href={WA.availability}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
              >
                {t("Узнать наличие Garden", locale)} <IconArrowRight className="h-4 w-4" />
              </a>
            </div>

            <Photo
              src={garden.img}
              alt={garden.alt}
              className="min-h-[260px] w-full lg:min-h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
