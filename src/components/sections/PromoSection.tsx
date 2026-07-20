import { featuredPromo as promo } from "@/data/promos";
import { WA } from "@/data/site";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { IconGift, IconArrowRight } from "@/components/ui/icons";

export default function PromoSection() {
  return (
    <section id="promo" className="bg-beige py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
            Выгода
          </p>
          <h2 className="eyebrow-line font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
            Акции и специальные предложения
          </h2>
        </div>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-emerald-deep to-emerald-900 shadow-card">
          <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep shadow-gold">
              <IconGift className="h-8 w-8" />
            </span>
            <div className="flex-1">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                {promo.badge}
              </span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                {promo.title}
              </h3>
              <p className="mt-2 text-lg font-semibold text-gold-soft">
                {promo.offer}
              </p>
              <p className="mt-2 text-sm text-white/75">{promo.details}</p>
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                {promo.note}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/promos"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
                >
                  Смотреть акции <IconArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={WA.promo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-gold/60 hover:text-gold-soft"
                >
                  <WhatsAppIcon size={18} className="shrink-0" />
                  Уточнить актуальность
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
