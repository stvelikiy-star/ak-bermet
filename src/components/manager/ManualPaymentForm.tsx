"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface ManualPaymentBookingOption {
  id: string;
  number: string;
  guest: string;
  totalKgs: number;
  paidKgs: number;
}

interface ManualPaymentFormProps {
  bookings: readonly ManualPaymentBookingOption[];
}

const ERROR_MESSAGES: Record<string, string> = {
  ACCESS_DENIED: "Недостаточно прав для фиксации оплаты.",
  BOOKING_NOT_FOUND: "Бронь не найдена.",
  PAYMENT_METHOD_REQUIRED: "Укажите способ оплаты.",
  INVALID_PAYMENT_AMOUNT: "Сумма оплаты должна быть больше нуля.",
  INVALID_PAYMENT: "Проверьте данные оплаты.",
  AUTH_CONFIGURATION: "Авторизация CRM временно не настроена.",
  PAYMENT_WRITE_FAILED: "Не удалось сохранить оплату. Деньги системой не списывались.",
};

function money(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} сом`;
}

function localDateTimeValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function ManualPaymentForm({ bookings }: ManualPaymentFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(bookings[0]?.id ?? "");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const selected = useMemo(() => bookings.find((booking) => booking.id === bookingId) ?? null, [bookingId, bookings]);
  const balance = selected ? Math.max(selected.totalKgs - selected.paidKgs, 0) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const localPaidAt = String(form.get("paidAt") ?? "");
    const parsed = new Date(localPaidAt);
    const payload = {
      action: "record",
      bookingId: String(form.get("bookingId") ?? ""),
      paidAt: Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "",
      method: String(form.get("method") ?? ""),
      amountKgs: Number(form.get("amountKgs")),
      receiptUrl: String(form.get("receiptUrl") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    try {
      const response = await fetch("/api/manager/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; code?: string; payment?: { balanceKgs?: number } };
      if (!response.ok || !result.ok) {
        const code = result.code ?? "PAYMENT_WRITE_FAILED";
        setMessage({ kind: "error", text: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.PAYMENT_WRITE_FAILED });
        return;
      }

      setMessage({
        kind: "success",
        text: `Оплата сохранена. Остаток по брони: ${money(Number(result.payment?.balanceKgs ?? 0))}.`,
      });
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Связь с CRM прервана. Проверьте соединение и повторите действие." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
      <div>
        <h2 className="font-display text-lg font-semibold text-emerald-deep">Зафиксировать оплату</h2>
        <p className="mt-1 text-xs text-muted">
          Оплату принимает менеджер вручную. CRM только сохраняет факт — никаких списаний или интернет-эквайринга здесь нет.
        </p>
      </div>

      {message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message.text}
        </div>
      ) : null}

      <label className="block text-xs font-medium text-muted">
        Бронь
        <select
          name="bookingId"
          required
          value={bookingId}
          onChange={(event) => setBookingId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep"
        >
          {bookings.map((booking) => (
            <option key={booking.id} value={booking.id}>{booking.number} — {booking.guest}</option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className="grid gap-2 rounded-lg border border-gold/15 bg-cream/40 p-3 text-xs sm:grid-cols-3">
          <div><span className="text-muted">Сумма брони</span><div className="font-semibold text-emerald-deep">{money(selected.totalKgs)}</div></div>
          <div><span className="text-muted">Уже зафиксировано</span><div className="font-semibold text-emerald-deep">{money(selected.paidKgs)}</div></div>
          <div><span className="text-muted">Текущий остаток</span><div className="font-semibold text-emerald-deep">{money(balance)}</div></div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium text-muted">
          Дата и время
          <input name="paidAt" type="datetime-local" required defaultValue={localDateTimeValue()} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Сумма, сом
          <input name="amountKgs" type="number" min="0.01" step="0.01" required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
        <label className="text-xs font-medium text-muted">
          Способ оплаты
          <input name="method" maxLength={120} required placeholder="Например: наличные" className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
        </label>
      </div>

      <label className="block text-xs font-medium text-muted">
        Ссылка на чек — необязательно
        <input name="receiptUrl" type="url" maxLength={2000} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
      </label>

      <label className="block text-xs font-medium text-muted">
        Комментарий — необязательно
        <textarea name="notes" maxLength={4000} rows={2} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
      </label>

      <button
        type="submit"
        disabled={submitting || bookings.length === 0}
        className="rounded-lg bg-emerald-deep px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Сохраняем…" : "Подтвердить факт оплаты"}
      </button>
    </form>
  );
}
