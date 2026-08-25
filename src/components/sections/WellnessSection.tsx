import Photo from "@/components/ui/Photo";
import { springs, spa } from "@/data/wellness";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";
import { getLocale } from "@/i18n/locale.server";
import { IconCheck, IconArrowRight } from "@/components/ui/icons";

type Block = {
  title: string;
  text: string;
  points: readonly string[];
  button: { label: string; href: string };
  img: string;
  alt: string;
  note?: string;
};

function Panel({ block, locale }: { block: Block; locale: Locale }) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-emerald-900/60 shadow-card sm:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-7">
        <h3 className="font-display text-2xl font-semibold text-white">
          {t(block.title, locale)}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {t(block.text, locale)}
        </p>
        <ul className="mt-5 space-y-2.5">
          {block.points.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2.5 text-sm text-white/85"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-soft">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {t(p, locale)}
            </li>
          ))}
        </ul>
        <a
          href={block.button.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
        >
          {t(block.button.label, locale)}
          <IconArrowRight className="h-4 w-4" />
        </a>
        {block.note && (
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            {t(block.note, locale)}
          </p>
        )}
      </div>
      <Photo
        src={block.img}
        alt={block.alt}
        className="min-h-[240px] w-full sm:min-h-full"
      />
    </div>
  );
}

export default async function WellnessSection() {
  const locale = await getLocale();
  return (
    <section id="wellness" className="relative bg-emerald-deep py-16 sm:py-24">
      <div className="grain absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel block={springs} locale={locale} />
          <Panel block={spa} locale={locale} />
        </div>
      </div>
    </section>
  );
}
