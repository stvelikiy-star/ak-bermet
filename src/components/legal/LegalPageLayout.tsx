import type { ReactNode } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { LEGAL, LEGAL_PAGES } from "@/data/legal";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Общий каркас юридической страницы AK BERMET.
 * Тёмная компактная шапка (заголовок + дата редакции) и читаемая колонка
 * текста (max-w-3xl) на молочном фоне — без «стены текста» на всю ширину.
 */
export default function LegalPageLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-cream">
      {/* Шапка */}
      <section className="relative overflow-hidden bg-emerald-deep">
        <div className="grain absolute inset-0 opacity-40" aria-hidden />
        <Container className="relative pb-12 pt-32 sm:pb-16 sm:pt-40">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-emerald-deep/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft backdrop-blur">
            Документы
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.12] text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-gold-soft/90">{LEGAL.lastUpdated}</p>
          {intro && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {intro}
            </p>
          )}
        </Container>
      </section>

      {/* Контент */}
      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          <article className="max-w-3xl">{children}</article>

          {/* Боковая навигация по документам */}
          <aside className="lg:pt-2">
            <div className="sticky top-24 rounded-2xl border border-gold/20 bg-white p-5 shadow-soft">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
                Все документы
              </h2>
              <ul className="space-y-1.5 text-sm">
                {LEGAL_PAGES.map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-emerald-deep transition-colors hover:bg-cream hover:text-gold-dark"
                    >
                      {p.label}
                      <IconArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-gold/15 pt-4 text-xs leading-relaxed text-muted">
                Вопросы по документам:{" "}
                <a
                  href={`mailto:${LEGAL.email}`}
                  className="font-medium text-emerald-deep hover:text-gold-dark"
                >
                  {LEGAL.email}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
