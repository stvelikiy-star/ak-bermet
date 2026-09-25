import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuestRequestForm from "@/components/guest/GuestRequestForm";
import { findGuestRoomByToken } from "@/lib/guest-qr";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    nosnippet: true,
  },
};

const DATE_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  kg: "ky-KG",
  en: "en-GB",
  kz: "kk-KZ",
};

export default async function GuestRoomPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await findGuestRoomByToken(token);
  if (!guest) notFound();

  const locale = await getLocale();
  const expires = new Date(guest.expiresAt).toLocaleDateString(DATE_LOCALE[locale]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-deep to-emerald-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="rounded-2xl border border-gold/30 bg-white/10 p-6 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">
            AK BERMET
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {t("Гостевой сервис", locale)}
          </h1>
          <p className="mt-2 text-base font-medium text-white/90">
            {guest.guestName}
          </p>
          <p className="mt-1 text-sm text-white/75">
            {t(guest.buildingName, locale)} · {t("номер", locale)}{" "}
            {guest.roomNumber}
          </p>
          <p className="mt-1 text-xs text-white/55">
            {t("Бронь", locale)} {guest.bookingNumber} ·{" "}
            {t(guest.categoryName, locale)} · {t("QR действует до", locale)}{" "}
            {expires}
          </p>
        </header>

        <section className="rounded-2xl border border-gold/20 bg-milk p-5 text-ink shadow-float">
          <h2 className="font-display text-xl font-semibold text-emerald-deep">
            {t("Что нужно в номер?", locale)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t(
              "Выберите услугу и при необходимости оставьте комментарий.",
              locale,
            )}
          </p>
          <GuestRequestForm token={token} locale={locale} />
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/75">
          <p>
            {t(
              "Для срочных вопросов позвоните на стойку размещения. Заявка передана персоналу AK BERMET.",
              locale,
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
