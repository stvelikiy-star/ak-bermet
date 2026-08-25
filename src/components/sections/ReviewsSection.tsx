import SectionHeading from "@/components/ui/SectionHeading";
import { reviews } from "@/data/home";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import { IconHeart } from "@/components/ui/icons";

export default async function ReviewsSection() {
  const locale = await getLocale();
  return (
    <section className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("Что отмечают гости", locale)}
          title={t("Отзывы гостей", locale)}
          subtitle={t(
            "Реальные отзывы добавляются по мере получения. Ниже — то, на что чаще всего обращают внимание гости.",
            locale
          )}
          className="mb-10 sm:mb-14"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.text}
              className="flex flex-col rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
                <IconHeart className="h-5 w-5" />
              </span>
              <blockquote className="flex-1 text-sm leading-relaxed text-ink/80">
                {t(r.text, locale)}
              </blockquote>
              <figcaption className="mt-5 border-t border-gold/15 pt-4">
                <span className="rounded-full bg-emerald-deep/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-dark">
                  {t(r.tag, locale)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
