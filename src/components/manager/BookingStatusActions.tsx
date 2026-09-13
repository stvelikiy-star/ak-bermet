"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  bookingNumber: string;
  status: string;
}

const ERROR_MESSAGE: Record<string, string> = {
  PREPAYMENT_REQUIRED: "Сначала зафиксируйте предоплату не меньше 20% в разделе «Оплаты».",
  CHECK_IN_TOO_EARLY: "Дата заезда ещё не наступила.",
  ROOM_NOT_READY_FOR_CHECK_IN: "Заселение заблокировано: номер не готов, снят с продажи или находится в техническом статусе.",
  BOOKING_ROOM_MISSING: "У брони нет активного размещения в номере.",
  TRANSITION_NOT_ALLOWED: "Этот переход статуса сейчас недоступен.",
  CANCELLATION_REASON_REQUIRED: "Для отмены обязательно укажите причину.",
  NO_SHOW_TOO_EARLY: "No-show можно отметить не раньше даты заезда.",
  BOOKING_NOT_FOUND: "Бронь не найдена или уже архивирована.",
  ACCESS_DENIED: "Недостаточно прав для изменения статуса брони.",
};

const ACTIONS: Record<string, Array<{ target: string; label: string; kind: "primary" | "danger" | "secondary" }>> = {
  pending_confirmation: [
    { target: "confirmed", label: "Подтвердить", kind: "primary" },
    { target: "cancelled", label: "Отменить", kind: "danger" },
  ],
  confirmed: [
    { target: "checked_in", label: "Заселить", kind: "primary" },
    { target: "no_show", label: "No-show", kind: "secondary" },
    { target: "cancelled", label: "Отменить", kind: "danger" },
  ],
  checked_in: [
    { target: "checked_out", label: "Выселить", kind: "primary" },
  ],
};

function buttonClass(kind: "primary" | "danger" | "secondary") {
  if (kind === "danger") return "rounded-full border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 disabled:opacity-50";
  if (kind === "secondary") return "rounded-full border border-amber-200 px-3 py-1.5 text-[11px] font-semibold text-amber-800 disabled:opacity-50";
  return "rounded-full bg-emerald-deep px-3 py-1.5 text-[11px] font-semibold text-gold-soft disabled:opacity-50";
}

export default function BookingStatusActions({ bookingId, bookingNumber, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const actions = ACTIONS[status] ?? [];

  if (actions.length === 0) return <span className="text-[11px] text-muted">Нет действий</span>;

  async function changeStatus(targetStatus: string) {
    let note = "";
    if (targetStatus === "cancelled") {
      const value = window.prompt(`Причина отмены брони ${bookingNumber}:`);
      if (value === null) return;
      note = value.trim();
      if (!note) {
        setMessage("Укажите причину отмены.");
        return;
      }
    } else if (targetStatus === "no_show") {
      const value = window.prompt(`Комментарий для no-show ${bookingNumber}:`, "Гость не заехал");
      if (value === null) return;
      note = value.trim() || "Гость не заехал";
    } else if (targetStatus === "checked_out") {
      if (!window.confirm(`Оформить выезд по брони ${bookingNumber}? После выезда автоматически создастся задача уборки.`)) return;
    }

    setBusy(targetStatus);
    setMessage("");
    try {
      const response = await fetch("/api/manager/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, targetStatus, note }),
      });
      const body = await response.json() as { ok?: boolean; code?: string };
      if (!response.ok || !body.ok) {
        setMessage(ERROR_MESSAGE[body.code ?? ""] ?? "Не удалось изменить статус брони.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Связь с CRM прервана. Статус не изменён.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-w-44 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={action.target}
            type="button"
            disabled={busy !== null}
            onClick={() => void changeStatus(action.target)}
            className={buttonClass(action.kind)}
          >
            {busy === action.target ? "Сохраняем…" : action.label}
          </button>
        ))}
      </div>
      {message ? <p className="max-w-64 text-[11px] leading-4 text-rose-700">{message}</p> : null}
    </div>
  );
}
