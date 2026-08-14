"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface ManualBookingRoomOption {
  id: string;
  label: string;
  maxCapacity: number;
  extraPlaces: number;
}

const SOURCE_OPTIONS = [
  ["manual", "Вручную"],
  ["phone", "Телефон"],
  ["whatsapp", "WhatsApp"],
  ["instagram", "Instagram"],
  ["website", "Сайт"],
  ["ai_chat", "AI-чат"],
  ["tour_agency", "Турагентство"],
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  ROOM_UNAVAILABLE: "Этот номер уже занят, удержан или заблокирован на выбранные даты.",
  ACCESS_DENIED: "Недостаточно прав для создания брони.",
  CUSTOMER_CONFLICT: "Телефон привязан к архивной записи клиента. Нужна проверка администратора.",
  ROOM_NOT_FOUND: "Номер не найден.",
  ROOM_NOT_SELLABLE: "Номер снят с продажи.",
  ROOM_OPERATIONALLY_BLOCKED: "Номер технически заблокирован.",
  ROOM_CAPACITY_EXCEEDED: "Количество гостей превышает максимальную вместимость номера.",
  EXTRA_BED_CAPACITY_EXCEEDED: "Указано больше дополнительных мест, чем доступно в номере.",
  INVALID_BOOKING_DATES: "Проверьте даты заезда и выезда.",
  INVALID_GUEST_COUNTS: "Проверьте количество гостей.",
  INVALID_TOTAL_AMOUNT: "Проверьте сумму бронирования.",
  INVALID_BOOKING: "Проверьте обязательные поля бронирования.",
  AUTH_CONFIGURATION: "Авторизация CRM временно не настроена.",
  BOOKING_CREATE_FAILED: "Не удалось создать бронь. Данные не были сохранены.",
};

function money(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

export default function ManualBookingForm({ rooms }: { rooms: readonly ManualBookingRoomOption[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [total, setTotal] = useState("0");

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === roomId) ?? null, [roomId, rooms]);
  const numericTotal = Number(total);
  const prepayment = Number.isFinite(numericTotal) && numericTotal >= 0 ? Math.round(numericTotal * 20) / 100 : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      roomUnitId: String(form.get("roomUnitId") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      checkIn: String(form.get("checkIn") ?? ""),
      checkOut: String(form.get("checkOut") ?? ""),
      adults: Number(form.get("adults")),
      children: Number(form.get("children")),
      extraBeds: Number(form.get("extraBeds")),
      source: String(form.get("source") ?? "manual"),
      totalAmountKgs: Number(form.get("totalAmountKgs")),
      notes: String(form.get("notes") ?? ""),
    };

    try {
      const response = await fetch("/api/manager/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; code?: string; booking?: { number?: string } };
      if (!response.ok || !result.ok) {
        const code = result.code ?? "BOOKING_CREATE_FAILED";
        setMessage({ kind: "error", text: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.BOOKING_CREATE_FAILED });
        return;
      }

      setMessage({
        kind: "success",
        text: result.booking?.number ? `Бронь ${result.booking.number} создана.` : "Бронь создана.",
      });
      event.currentTarget.reset();
      setRoomId(rooms[0]?.id ?? "");
      setTotal("0");
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Связь с CRM прервана. Повторите действие после проверки соединения." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
      <div>
        <h2 className="font-display text-lg font-semibold text-emerald-deep">Новая бронь</h2>
        <p className="mt-1 text-xs text-muted">
          Бронь создаётся одной транзакцией. При пересечении с бронью, удержанием или тех.блоком ничего не сохраняется.
        </p>
      </div>

      {message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted">
          ФИО / имя гостя
          <input name="fullName" required maxLength={200} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Телефон
          <input name="phone" required maxLength={80} placeholder="+996..." className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Email — необязательно
          <input name="email" type="email" maxLength={320} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Источник
          <select name="source" defaultValue="manual" className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep">
            {SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Заезд
          <input name="checkIn" type="date" required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Выезд
          <input name="checkOut" type="date" required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
      </div>

      <label className="block text-xs font-medium text-muted">
        Номер
        <select
          name="roomUnitId"
          required
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep"
        >
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
        </select>
        {selectedRoom ? (
          <span className="mt-1 block text-[11px] text-muted">
            Максимум гостей: {selectedRoom.maxCapacity}; дополнительных мест: {selectedRoom.extraPlaces}.
          </span>
        ) : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted">
          Взрослые
          <input name="adults" type="number" min={1} step={1} defaultValue={1} required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Дети
          <input name="children" type="number" min={0} step={1} defaultValue={0} required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Доп. места
          <input name="extraBeds" type="number" min={0} max={selectedRoom?.extraPlaces ?? 0} step={1} defaultValue={0} required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted">
          Сумма брони, сом
          <input
            name="totalAmountKgs"
            type="number"
            min={0}
            step="0.01"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep"
          />
        </label>
        <div className="rounded-lg border border-gold/15 bg-cream/40 px-3 py-2">
          <div className="text-xs text-muted">Предоплата 20%</div>
          <div className="mt-1 font-semibold text-emerald-deep">{money(prepayment)} сом</div>
        </div>
      </div>

      <label className="block text-xs font-medium text-muted">
        Комментарий
        <textarea name="notes" maxLength={4000} rows={3} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
      </label>

      <button
        type="submit"
        disabled={submitting || rooms.length === 0}
        className="rounded-lg bg-emerald-deep px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Создаём…" : "Создать бронь"}
      </button>
    </form>
  );
}
