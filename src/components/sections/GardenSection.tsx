import Photo from "@/components/ui/Photo";
import { garden } from "@/data/rooms";
import { WA } from "@/data/site";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
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

export default function GardenSection() {
  return (
    <section id="garden" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-emerald-deep to-emerald-900 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <span className="mb-4 w-fit rounded-full bg-gradient-to-b from-gold-soft to-gold px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep shadow-gold">
                {garden.badge}
              </span>
              <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                {garden.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                {garden.text}
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
                      {f}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/garden"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
                >
                  Подробнее о Garden <IconArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={WA.garden}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-gold/60 hover:text-gold-soft"
                >
                  <WhatsAppIcon size={18} className="shrink-0" />
                  Узнать наличие Garden
                </a>
              </div>
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
