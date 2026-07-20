import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Photo from "@/components/ui/Photo";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import PageCTA from "@/components/sections/PageCTA";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { WA } from "@/data/site";
import {
  roomDetails,
  roomDetailSlugs,
  getRoomDetail,
} from "@/data/room-details";
import {
  IconCheck,
  IconShield,
  IconArrowRight,
  IconUsers,
} from "@/components/ui/icons";

export function generateStaticParams() {
  return roomDetailSlugs.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const room = getRoomDetail(params.slug);
  if (!room) return { title: "Номер не найден" };
  return {
    title: room.title,
    description: room.metaDescription,
    alternates: { canonical: `/rooms/${room.slug}` },
  };
}

export default function RoomDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const room = getRoomDetail(params.slug);
  if (!room) notFound();

  const waHref = WA[room.whatsappKey];

  return (
    <main>
      {/* Hero + breadcrumbs */}
      <section className="relative overflow-hidden bg-emerald-deep">
        <div className="absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url('${room.gallery[0]?.src}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-deep via-emerald-deep/85 to-emerald-deep/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep via-transparent to-emerald-deep/30" />
        </div>
        <Container className="relative pb-12 pt-28 sm:pb-16 sm:pt-36">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Номера", href: "/rooms" },
              { label: room.title },
            ]}
          />
          <div className="mt-5 max-w-2xl">
            {room.badge && (
              <span className="mb-4 inline-block rounded-full bg-gradient-to-b from-gold-soft to-gold px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep shadow-gold">
                {room.badge}
              </span>
            )}
            <h1 className="font-display text-3xl font-semibold leading-[1.12] text-white sm:text-5xl">
              {room.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {room.intro}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
              >
                <WhatsAppIcon size={20} className="shrink-0" />
                Узнать наличие
              </a>
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white backdrop-blur transition-colors hover:border-gold/60 hover:text-gold-soft"
              >
                Все номера
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Галерея */}
      <section className="bg-cream py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {room.gallery.map((g, i) => (
              <Photo
                key={i}
                src={g.src}
                alt={g.alt}
                className={`aspect-[4/3] w-full rounded-2xl ${
                  i === 0 ? "sm:col-span-2 sm:row-span-2 sm:aspect-auto" : ""
                }`}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Фотографии приведены для примера. Реальные фото номеров уточняйте у
            администратора.
          </p>
        </Container>
      </section>

      {/* Описание + ключевые факты */}
      <section className="bg-beige py-14 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-display text-2xl font-semibold text-emerald-deep sm:text-3xl">
                Описание
              </h2>
              <div className="mt-4 space-y-4">
                {room.description.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted sm:text-base">
                    {p}
                  </p>
                ))}
              </div>

              <h3 className="mt-8 font-display text-xl font-semibold text-emerald-deep">
                Удобства
              </h3>
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {room.amenities.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-2.5 rounded-xl border border-gold/15 bg-milk px-3.5 py-2.5 text-sm text-emerald-deep shadow-soft"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sidebar: факты */}
            <aside className="lg:col-span-5">
              <div className="rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft">
                <h3 className="mb-4 font-display text-lg font-semibold text-emerald-deep">
                  Ключевые факты
                </h3>
                <dl className="divide-y divide-gold/10">
                  {room.facts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <dt className="text-sm text-muted">{f.label}</dt>
                      <dd className="text-right text-sm font-semibold text-emerald-deep">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-deep px-5 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
                >
                  <WhatsAppIcon size={18} className="shrink-0" />
                  Узнать наличие
                </a>
              </div>

              {/* Кому подходит */}
              <div className="mt-5 rounded-2xl border border-gold/15 bg-milk p-6 shadow-soft">
                <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-emerald-deep">
                  <IconUsers className="h-5 w-5 text-gold-dark" />
                  Кому подходит
                </h3>
                <ul className="space-y-2.5">
                  {room.bestFor.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-sm text-muted"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* Важные условия */}
      <section className="bg-cream py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
            <h3 className="mb-5 flex items-center gap-2.5 font-display text-xl font-semibold text-emerald-deep">
              <IconShield className="h-6 w-6 text-gold-dark" />
              Важные условия
            </h3>
            <ul className="space-y-3">
              {room.conditions.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {c}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Бронирование подтверждает администратор после проверки наличия.
                Предоплата — 20%. Цены и наличие уточняются.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-4 border-t border-gold/15 pt-5 text-sm">
              <Link
                href="/legal/public-offer"
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-deep transition-colors hover:text-gold-dark"
              >
                Публичная оферта <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/legal/refund"
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-deep transition-colors hover:text-gold-dark"
              >
                Возврат и отмена <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Другие категории */}
      <section className="bg-beige py-14 sm:py-20">
        <Container>
          <h2 className="mb-8 text-center font-display text-2xl font-semibold text-emerald-deep sm:text-3xl">
            Другие варианты размещения
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {roomDetails
              .filter((r) => r.slug !== room.slug)
              .map((r) => (
                <Link
                  key={r.slug}
                  href={`/rooms/${r.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-milk px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
                >
                  {r.title} <IconArrowRight className="h-4 w-4" />
                </Link>
              ))}
          </div>
        </Container>
      </section>

      <PageCTA
        title="Узнать наличие"
        text="Напишите нам в WhatsApp — администратор проверит наличие на ваши даты и количество гостей и подтвердит бронирование."
        cta={{ label: "Узнать наличие", href: waHref }}
      />
    </main>
  );
}
