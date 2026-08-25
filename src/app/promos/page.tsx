import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import BookingLeadForm from "@/components/forms/BookingLeadForm";
import { WA } from "@/data/site";
import { promos, promosPlaceholder } from "@/data/promos";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import { IconGift, IconArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/promos" },
  title: "Акции и предложения",
  description:
    "Сезонные предложения для отдыха, номеров и корпоративных заездов в комплексе AK BERMET на Иссык-Куле.",
};

export default async function PromosPage() {
  const locale = await getLocale();

  return (
    <main>
      <PageHero
        badge={t("Выгода", locale)}
        title={t("Акции и специальные предложения", locale)}
        subtitle={t("Сезонные предложения для отдыха, номеров и корпоративных заездов.", locale)}
        image="/images/hero/home-hero.png"
        cta={{ label: t("Уточнить актуальные акции", locale), href: WA.promo31 }}
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {promos.map((p) => (
              <div
                key={p.title}
                className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-emerald-deep to-emerald-900 p-7 shadow-card sm:p-9"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep shadow-gold">
                  <IconGift className="h-7 w-7" />
                </span>
                <span className="mt-5 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                  {t(p.badge, locale)}
                </span>
                <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                  {t(p.title, locale)}
                </h2>
                <p className="mt-2 text-lg font-semibold text-gold-soft">
                  {t(p.offer, locale)}
                </p>
                <p className="mt-2 text-sm text-white/75">{t(p.details, locale)}</p>
                <p className="mt-3 text-xs leading-relaxed text-white/45">
                  {t(p.note, locale)}
                </p>
                <a
                  href={p.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
                >
                  {t(p.cta.label, locale)} <IconArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}

            {/* Плейсхолдер будущих акций */}
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gold/30 bg-milk p-8 text-center shadow-soft">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
                <IconGift className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-semibold text-emerald-deep">
                {t(promosPlaceholder, locale)}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t(
                  "Следите за обновлениями или уточняйте актуальные предложения у администратора.",
                  locale,
                )}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Форма заявки по акции */}
      <section className="bg-beige py-16 sm:py-24">
        <Container className="max-w-3xl">
          <BookingLeadForm
            interest="promo"
            anchorId="promo-form"
            title={t("Заявка по акции", locale)}
            subtitle={t("Оставьте контакты — администратор подтвердит актуальность и условия акции.", locale)}
          />
        </Container>
      </section>

      <PageCTA
        title={t("Уточнить актуальную акцию", locale)}
        text={t("Актуальность предложения и условия подтверждает администратор. Напишите нам в WhatsApp.", locale)}
        cta={{ label: t("Уточнить актуальные акции", locale), href: WA.promo31 }}
      />
    </main>
  );
}
