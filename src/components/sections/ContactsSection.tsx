import SectionHeading from "@/components/ui/SectionHeading";
import { SITE, WA } from "@/data/site";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import {
  IconPin,
  IconWhatsApp,
  IconMail,
  IconPhone,
  IconArrowRight,
} from "@/components/ui/icons";

export default async function ContactsSection() {
  const locale = await getLocale();
  return (
    <section id="contacts" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("Свяжитесь с нами", locale)}
          title={t("Контакты", locale)}
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Реквизиты */}
          <div className="rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft sm:p-8">
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
                <span className="leading-relaxed text-ink/80">
                  {SITE.address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <IconWhatsApp className="h-5 w-5 shrink-0 text-gold-dark" />
                <a
                  href={`tel:+${SITE.phoneRaw}`}
                  className="text-ink/80 hover:text-emerald-deep"
                >
                  {SITE.phoneDisplay}{" "}
                  <span className="text-xs text-muted">(WhatsApp)</span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <IconPhone className="h-5 w-5 shrink-0 text-gold-dark" />
                <a
                  href={`tel:+${SITE.springsPhoneRaw}`}
                  className="text-ink/80 hover:text-emerald-deep"
                >
                  {SITE.springsPhoneDisplay}{" "}
                  <span className="text-xs text-muted">{t("(источники)", locale)}</span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <IconMail className="h-5 w-5 shrink-0 text-gold-dark" />
                <a
                  href={`mailto:${SITE.email}`}
                  className="text-ink/80 hover:text-emerald-deep"
                >
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>

          {/* CTA + карта */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={WA.booking}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-3.5 text-sm font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
              >
                <WhatsAppIcon size={16} className="shrink-0" />
                {t("Написать в WhatsApp", locale)}
              </a>
              <a
                href={WA.availability}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-milk px-5 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
              >
                {t("Узнать наличие", locale)}
              </a>
            </div>

            <a
              href={SITE.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-gold/15 shadow-soft"
            >
              <div className="relative flex flex-1 items-center justify-center p-8">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('/images/hero/territory-hero.png')" }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-deep/90 via-emerald-800/75 to-emerald-deep/60" />
                <span className="relative flex items-center gap-2 font-display text-lg font-semibold text-gold-soft">
                  <IconPin className="h-5 w-5" /> {t("Ак-Бермет на карте", locale)}
                </span>
              </div>
              <span className="flex items-center justify-center gap-1.5 bg-milk py-3 text-sm font-semibold text-emerald-deep transition-colors group-hover:text-gold-dark">
                {t("Показать на карте (2GIS)", locale)}{" "}
                <IconArrowRight className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
