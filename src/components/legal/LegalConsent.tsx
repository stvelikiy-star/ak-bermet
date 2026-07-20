import Link from "next/link";

/**
 * Короткий текст согласия под формами заявок.
 * Мелкий, но читаемый; на mobile не ломает форму.
 */
export default function LegalConsent() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      Отправляя заявку, вы соглашаетесь с условиями обработки персональных данных
      и принимаете условия публичной оферты.{" "}
      <Link
        href="/legal/public-offer"
        className="font-medium text-emerald-deep underline-offset-2 hover:text-gold-dark hover:underline"
      >
        Публичная оферта
      </Link>{" "}
      ·{" "}
      <Link
        href="/legal/privacy"
        className="font-medium text-emerald-deep underline-offset-2 hover:text-gold-dark hover:underline"
      >
        Политика конфиденциальности
      </Link>
    </p>
  );
}
