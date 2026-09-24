import Link from "next/link";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

/**
 * Короткий текст согласия под формами заявок.
 * Мелкий, но читаемый; на mobile не ломает форму.
 */
export default function LegalConsent({ locale = "ru" }: { locale?: Locale }) {
  return (
    <p className="text-xs leading-relaxed text-muted">
      {t("Отправляя заявку, вы соглашаетесь с условиями обработки персональных данных и принимаете условия публичной оферты.", locale)}{" "}
      <Link
        href="/legal/public-offer"
        className="font-medium text-emerald-deep underline-offset-2 hover:text-gold-dark hover:underline"
      >
        {t("Публичная оферта", locale)}
      </Link>{" "}
      ·{" "}
      <Link
        href="/legal/privacy"
        className="font-medium text-emerald-deep underline-offset-2 hover:text-gold-dark hover:underline"
      >
        {t("Политика конфиденциальности", locale)}
      </Link>
    </p>
  );
}
