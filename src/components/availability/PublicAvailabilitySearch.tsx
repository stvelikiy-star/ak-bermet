"use client";

import { FormEvent, useState } from "react";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

export type AvailabilityItem = {
  category: string;
  building: string;
  capacity: number;
  view?: string;
  hasWifi?: boolean;
  repairLevel?: string;
  preliminary: true;
};

export type AvailabilitySelection = {
  checkIn: string;
  checkOut: string;
  guests: number;
  category: string;
  building: string;
};

type AvailabilityResponse = {
  ok?: boolean;
  message?: string;
  items?: AvailabilityItem[];
};

const CATEGORIES = [
  ["", "Все категории"],
  ["Garden Rooms", "Garden Rooms"],
  ["Стандарт", "Стандарт"],
  ["Люкс", "Люкс"],
  ["Полулюкс", "Полулюкс"],
  ["Семейный 4-местный", "Семейные"],
  ["Коттеджи и срубы", "Коттеджи и срубы"],
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  locale?: Locale;
  onSelect?: (selection: AvailabilitySelection) => void;
  bookingAnchorId?: string;
};

export default function PublicAvailabilitySearch({
  locale = "ru",
  onSelect,
  bookingAnchorId = "booking-form",
}: Props = {}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [message, setMessage] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setMessage(t("Укажите корректные даты: выезд должен быть позже заезда.", locale));
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        guests: String(Math.max(1, Number(guests) || 1)),
      });
      if (category) params.set("category", category);

      const response = await fetch(`/api/availability?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as AvailabilityResponse;
      if (!response.ok || !data.ok) {
        setItems([]);
        setMessage(t(data.message ?? "Не удалось проверить доступность. Попробуйте позже.", locale));
        setSearched(false);
        return;
      }

      setItems(data.items ?? []);
      setSearched(true);
      setMessage(data.message ? t(data.message, locale) : "");
    } catch {
      setItems([]);
      setSearched(false);
      setMessage(t("Не удалось связаться с системой доступности. Напишите администратору.", locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
          {t("Реальная проверка", locale)}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-emerald-deep sm:text-3xl">
          {t("Проверить варианты размещения", locale)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("Запрос читается из текущего номерного фонда и занятости. Результат предварительный: конкретный номер и финальную бронь подтверждает администратор.", locale)}
        </p>
      </div>

      <form onSubmit={search} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-muted">
          {t("Заезд", locale)}
          <input
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gold/20 bg-white px-3 py-2.5 text-sm text-emerald-deep"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          {t("Выезд", locale)}
          <input
            type="date"
            min={checkIn || todayIso()}
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gold/20 bg-white px-3 py-2.5 text-sm text-emerald-deep"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          {t("Гости", locale)}
          <input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gold/20 bg-white px-3 py-2.5 text-sm text-emerald-deep"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          {t("Категория", locale)}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gold/20 bg-white px-3 py-2.5 text-sm text-emerald-deep"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{t(label, locale)}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="self-end rounded-lg bg-emerald-deep px-4 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? t("Проверяем…", locale) : t("Проверить", locale)}
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded-lg border border-gold/15 bg-cream px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}

      {searched ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-emerald-deep">
              {items.length ? `${t("Подходящих вариантов", locale)}: ${items.length}` : t("Подходящих вариантов не найдено", locale)}
            </h3>
            <a
              href={`#${bookingAnchorId}`}
              className="text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline"
            >
              {t("Оставить заявку", locale)}
            </a>
          </div>

          {items.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <article key={`${item.building}-${item.category}-${index}`} className="rounded-xl border border-gold/15 bg-white p-4">
                  <h4 className="font-semibold text-emerald-deep">{t(item.category, locale)}</h4>
                  <p className="mt-1 text-xs text-muted">{t(item.building, locale)} · {t("до", locale)} {item.capacity} {t("гостей", locale)}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {t("Предварительный вариант. Администратор подтвердит конкретный номер, тариф и возможность бронирования.", locale)}
                  </p>
                  <a
                    href={`#${bookingAnchorId}`}
                    onClick={() =>
                      onSelect?.({
                        checkIn,
                        checkOut,
                        guests: Math.max(1, Number(guests) || 1),
                        category: item.category,
                        building: item.building,
                      })
                    }
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-deep px-4 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
                  >
                    {t("Выбрать этот вариант", locale)}
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {t("Оставьте заявку ниже — администратор проверит альтернативные даты и категории.", locale)}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
