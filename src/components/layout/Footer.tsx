import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { SITE, WA } from "@/data/site";
import { FOOTER_NAV } from "@/data/navigation";
import { LEGAL_PAGES } from "@/data/legal";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";
import {

  IconPhone,
  IconMail,
  IconPin,
  IconArrowRight,
} from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

// TODO: добавить реальные ссылки на соцсети, когда они появятся.
// Пока массив пуст — блок соцсетей не отображается (никаких "#"-заглушек).
const SOCIAL_LINKS: { label: string; href: string }[] = [];

export default async function Footer() {
  const locale = await getLocale();
  return (
    <footer id="footer" className="relative bg-emerald-deep pt-16 text-white/80">
      <div className="grain absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Бренд */}
          <div>
            <Logo variant="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              {t(SITE.footerText, locale)}
            </p>
            {SOCIAL_LINKS.length > 0 && (
              <div className="mt-5 flex gap-2.5">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`AK BERMET — ${s.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs font-semibold text-white/70 transition-colors hover:border-gold/60 hover:text-gold-soft"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Контакты */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft">
              Бронирование и вопросы
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <IconPhone className="h-4 w-4 shrink-0 text-gold-soft" />
                <a href={`tel:+${SITE.phoneRaw}`} className="hover:text-white">
                  {SITE.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <IconPhone className="h-4 w-4 shrink-0 text-gold-soft" />
                <a
                  href={`tel:+${SITE.springsPhoneRaw}`}
                  className="hover:text-white"
                >
                  {SITE.springsPhoneDisplay}
                  <span className="ml-1 text-xs text-white/45">
                    {t("(источники)", locale)}
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <IconMail className="h-4 w-4 shrink-0 text-gold-soft" />
                <a href={`mailto:${SITE.email}`} className="hover:text-white">
                  {SITE.email}
                </a>
              </li>
            </ul>
            <a
              href={WA.booking}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              WhatsApp
            </a>
          </div>

          {/* Меню */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft">
              Меню
            </h4>
            <ul className="grid grid-cols-1 gap-2.5 text-sm">
              {FOOTER_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/70 hover:text-gold-soft"
                  >
                    {t(item.label, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Карта */}
          <div>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft">
              Как нас найти
            </h4>
            <p className="mb-4 flex items-start gap-2.5 text-sm leading-relaxed text-white/65">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
              {SITE.address}
            </p>
            <a
              href={SITE.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-white/10"
            >
              <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-teal-700 via-emerald-800 to-emerald-deep">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.18) 1px,transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                  aria-hidden
                />
                <span className="relative flex items-center gap-1.5 text-sm font-semibold text-gold-soft">
                  <IconPin className="h-4 w-4" /> Ак-Бермет
                </span>
              </div>
              <span className="flex items-center justify-center gap-1.5 bg-white/5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/80 transition-colors group-hover:text-gold-soft">
                {t("Показать на карте (2GIS)", locale)}{" "}
                <IconArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </div>

        {/* Документы — отдельный блок (рабочие ссылки, без "#") */}
        <div className="border-t border-white/10 py-6">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft">
            Документы
          </h4>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {LEGAL_PAGES.map((doc) => (
              <li key={doc.href}>
                <Link
                  href={doc.href}
                  className="text-white/70 hover:text-gold-soft"
                >
                  {t(doc.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="gold-rule" />
        <div className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("Ак-Бермет. Все права защищены.", locale)}
          </p>
          <div className="flex gap-5">
            <Link href="/legal/public-offer" className="hover:text-gold-soft">
              {t("Публичная оферта", locale)}
            </Link>
            <Link href="/legal/privacy" className="hover:text-gold-soft">
              {t("Политика конфиденциальности", locale)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
