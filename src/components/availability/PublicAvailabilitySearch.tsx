"use client";

import { FormEvent, useState } from "react";

type AvailabilityItem = {
  category: string;
  building: string;
  capacity: number;
  view?: string;
  hasWifi?: boolean;
  repairLevel?: string;
  preliminary: true;
};

type AvailabilityResponse = {
  ok?: boolean;
  message?: string;
  items?: AvailabilityItem[];
};

const CATEGORIES = [
  ["", "Все категории"],
  ["Garden", "Garden"],
  ["Люкс", "Люкс"],
  ["Полулюкс", "Полулюкс"],
  ["Семейный", "Семейные"],
  ["Коттедж", "Коттеджи"],
  ["Сруб", "Срубы"],
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PublicAvailabilitySearch() {
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
      setMessage("Укажите корректные даты: выезд должен быть позже заезда.");
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
        setMessage(data.message ?? "Не удалось проверить доступность. Попробуйте позже.");
        setSearched(false);
        return;
      }

      setItems(data.items ?? []);
      setSearched(true);
      setMessage(data.message ?? "");
    } catch {
      setItems([]);
      setSearched(false);
      setMessage("Не удалось связаться с системой доступности. Напишите администратору.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
          Реальная проверка
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-emerald-deep sm:text-3xl">
          Проверить варианты размещения
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Запрос читается из текущего номерного фонда и занятости. Результат
          предварительный: конкретный номер и финальную бронь подтверждает администратор.
        </p>
      </div>

      <form onSubmit={search} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-muted">
          Заезд
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
          Выезд
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
          Гости
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
          Категория
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gold/20 bg-white px-3 py-2.5 text-sm text-emerald-deep"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="self-end rounded-lg bg-emerald-deep px-4 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "Проверяем…" : "Проверить"}
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
              {items.length ? `Подходящих вариантов: ${items.length}` : "Подходящих вариантов не найдено"}
            </h3>
            <a
              href="#booking-form"
              className="text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline"
            >
              Оставить заявку
            </a>
          </div>

          {items.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article key={`${item.building}-${item.category}`} className="rounded-xl border border-gold/15 bg-white p-4">
                  <h4 className="font-semibold text-emerald-deep">{item.category}</h4>
                  <p className="mt-1 text-xs text-muted">{item.building} · до {item.capacity} гостей</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Предварительный вариант. Администратор подтвердит конкретный номер,
                    тариф и возможность бронирования.
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Оставьте заявку ниже — администратор проверит альтернативные даты и категории.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
