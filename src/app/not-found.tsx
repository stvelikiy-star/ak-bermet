import Link from "next/link";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";

export default async function NotFound() {
  const locale = await getLocale();

  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-cream px-4 pb-20 pt-32">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold-dark">
          404 · AK BERMET
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-emerald-deep sm:text-5xl">
          {t("Страница не найдена", locale)}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          {t("Такой страницы нет или ссылка устарела.", locale)}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-emerald-deep px-6 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
          >
            {t("Вернуться на главную", locale)}
          </Link>
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center rounded-full border border-gold/40 bg-milk px-6 py-3 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            {t("Перейти к номерам", locale)}
          </Link>
        </div>
      </div>
    </main>
  );
}
