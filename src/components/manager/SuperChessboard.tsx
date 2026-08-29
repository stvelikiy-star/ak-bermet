"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ManualBookingForm, { type ManualBookingRoomOption } from "@/components/manager/ManualBookingForm";
import {
  addDays,
  daysBetween,
  findPeriodForDate,
  isRoomOperationallyBlocked,
  type BookingChessboardData,
  type BookingServiceOption,
  type ChessboardPeriod,
  type ChessboardRoom,
} from "@/lib/booking-chessboard";

type Selection =
  | { kind: "new"; roomId: string; date: string }
  | { kind: "booking"; period: ChessboardPeriod }
  | null;

interface PlacementPreview {
  available: boolean;
  code?: string;
  bookingNumber?: string;
  targetRoomNumber?: string;
  checkIn?: string;
  checkOut?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: "Ожидает подтверждения",
  confirmed: "Подтверждена",
  checked_in: "Заселён",
  checked_out: "Выехал",
  cancelled: "Отменена",
  no_show: "Не заехал",
};

const PLACEMENT_ERROR: Record<string, string> = {
  ROOM_UNAVAILABLE: "На выбранные даты номер уже занят, удержан или заблокирован.",
  ROOM_NOT_SELLABLE: "Номер снят с продажи.",
  ROOM_OPERATIONALLY_BLOCKED: "Номер технически заблокирован.",
  ROOM_CAPACITY_EXCEEDED: "Вместимость выбранного номера меньше состава гостей.",
  EXTRA_BED_CAPACITY_EXCEEDED: "В выбранном номере недостаточно дополнительных мест.",
  BOOKING_MOVE_STATUS_NOT_ALLOWED: "Перемещать можно только ожидающую подтверждения или подтверждённую бронь.",
  BOOKING_ROOM_NOT_FOUND: "Размещение брони не найдено.",
  ACCESS_DENIED: "Недостаточно прав для изменения брони.",
  READ_FAILED: "Не удалось проверить занятость. Изменения не выполнялись.",
};

const SERVICE_ERROR: Record<string, string> = {
  MANUAL_SERVICE_PRICE_REQUIRED: "Для этой услуги укажите цену.",
  SERVICE_NOT_FOUND: "Услуга не найдена или отключена.",
  INVALID_SERVICE_QUANTITY: "Проверьте количество услуги.",
  ACCESS_DENIED: "Недостаточно прав для изменения услуг.",
};

function enumerateDates(from: string, to: string): string[] {
  const total = daysBetween(from, to);
  return Array.from({ length: Math.max(0, total) }, (_, index) => addDays(from, index));
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function humanDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function money(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

function roomLabel(room: ChessboardRoom): string {
  return `${room.building} · № ${room.roomNumber} · ${room.category}`;
}

function stateClass(state: ChessboardPeriod["state"]): string {
  if (state === "booking") return "border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-200";
  if (state === "hold") return "border-amber-200 bg-amber-100 text-amber-900";
  return "border-rose-200 bg-rose-100 text-rose-900";
}

function isMovable(period: ChessboardPeriod): boolean {
  return Boolean(period.booking && ["pending_confirmation", "confirmed"].includes(period.booking.status));
}

export default function SuperChessboard({ data }: { data: BookingChessboardData }) {
  const router = useRouter();
  const dates = useMemo(() => enumerateDates(data.from, data.to), [data.from, data.to]);
  const [selection, setSelection] = useState<Selection>(null);
  const [dragged, setDragged] = useState<ChessboardPeriod | null>(null);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [moveCheckIn, setMoveCheckIn] = useState("");
  const [moveCheckOut, setMoveCheckOut] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementMessage, setPlacementMessage] = useState("");
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceMessage, setServiceMessage] = useState("");

  const roomsForBooking: ManualBookingRoomOption[] = useMemo(
    () => data.rooms
      .filter((room) => !isRoomOperationallyBlocked(room))
      .map((room) => ({
        id: room.id,
        label: roomLabel(room),
        maxCapacity: room.maxCapacity ?? 1,
        extraPlaces: room.extraPlaces ?? 0,
      })),
    [data.rooms],
  );

  const groups = useMemo(() => {
    const result = new Map<string, ChessboardRoom[]>();
    for (const room of data.rooms) {
      const current = result.get(room.building) ?? [];
      current.push(room);
      result.set(room.building, current);
    }
    return [...result.entries()];
  }, [data.rooms]);

  const selectedBooking = selection?.kind === "booking" ? selection.period : null;
  const currentRoom = selectedBooking ? data.rooms.find((room) => room.id === selectedBooking.roomId) ?? null : null;

  function openBooking(period: ChessboardPeriod) {
    if (!period.booking) return;
    setSelection({ kind: "booking", period });
    setTargetRoomId(period.roomId);
    setMoveCheckIn(period.start);
    setMoveCheckOut(period.end);
    setMoveReason("");
    setPlacementPreview(null);
    setPlacementMessage("");
    setServiceMessage("");
  }

  function closeDrawer() {
    setSelection(null);
    setDragged(null);
    setPlacementPreview(null);
    setPlacementMessage("");
    setServiceMessage("");
  }

  async function previewPlacement(
    period: ChessboardPeriod,
    roomId = targetRoomId,
    checkIn = moveCheckIn,
    checkOut = moveCheckOut,
  ) {
    if (!period.booking) return;
    setPlacementBusy(true);
    setPlacementMessage("");
    setPlacementPreview(null);
    try {
      const response = await fetch("/api/manager/bookings/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          bookingRoomId: period.booking.bookingRoomId,
          targetRoomUnitId: roomId,
          checkIn,
          checkOut,
          reason: moveReason,
        }),
      });
      const result = await response.json() as {
        ok?: boolean;
        available?: boolean;
        code?: string;
        preview?: { bookingNumber?: string; targetRoomNumber?: string; checkIn?: string; checkOut?: string };
      };
      if (!response.ok || !result.ok) {
        const code = result.code ?? "READ_FAILED";
        setPlacementMessage(PLACEMENT_ERROR[code] ?? "Не удалось проверить перемещение.");
        return;
      }
      if (!result.available) {
        setPlacementPreview({ available: false, code: result.code });
        setPlacementMessage(PLACEMENT_ERROR[result.code ?? ""] ?? "Выбранное размещение недоступно.");
        return;
      }
      setPlacementPreview({ available: true, ...result.preview });
    } catch {
      setPlacementMessage("Связь с CRM прервана. Изменения не выполнялись.");
    } finally {
      setPlacementBusy(false);
    }
  }

  async function commitPlacement() {
    if (!selectedBooking?.booking || !placementPreview?.available) return;
    setPlacementBusy(true);
    setPlacementMessage("");
    try {
      const response = await fetch("/api/manager/bookings/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "commit",
          bookingRoomId: selectedBooking.booking.bookingRoomId,
          targetRoomUnitId: targetRoomId,
          checkIn: moveCheckIn,
          checkOut: moveCheckOut,
          reason: moveReason,
        }),
      });
      const result = await response.json() as { ok?: boolean; code?: string };
      if (!response.ok || !result.ok) {
        const code = result.code ?? "ROOM_UNAVAILABLE";
        setPlacementPreview(null);
        setPlacementMessage(PLACEMENT_ERROR[code] ?? "Перемещение не выполнено.");
        return;
      }
      closeDrawer();
      router.refresh();
    } catch {
      setPlacementMessage("Связь с CRM прервана. Перемещение не выполнено.");
    } finally {
      setPlacementBusy(false);
    }
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>, period: ChessboardPeriod) {
    if (!isMovable(period)) {
      event.preventDefault();
      return;
    }
    setDragged(period);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", period.booking?.bookingRoomId ?? "");
  }

  function onDrop(event: DragEvent<HTMLButtonElement>, room: ChessboardRoom, date: string) {
    event.preventDefault();
    if (!dragged?.booking || isRoomOperationallyBlocked(room)) return;
    const existing = findPeriodForDate(room.id, data.periods, date);
    if (existing && existing.sourceId !== dragged.sourceId) return;
    const duration = daysBetween(dragged.start, dragged.end);
    const checkOut = addDays(date, duration);
    openBooking(dragged);
    setTargetRoomId(room.id);
    setMoveCheckIn(date);
    setMoveCheckOut(checkOut);
    void previewPlacement(dragged, room.id, date, checkOut);
    setDragged(null);
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBooking?.booking || serviceBusy) return;
    const form = new FormData(event.currentTarget);
    setServiceBusy(true);
    setServiceMessage("");
    try {
      const response = await fetch("/api/manager/bookings/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.booking.bookingId,
          serviceCode: String(form.get("serviceCode") ?? ""),
          quantity: Number(form.get("quantity") ?? 1),
          unitPriceKgs: String(form.get("unitPriceKgs") ?? ""),
          scheduledFor: String(form.get("scheduledFor") ?? ""),
          notes: String(form.get("notes") ?? ""),
        }),
      });
      const result = await response.json() as { ok?: boolean; code?: string };
      if (!response.ok || !result.ok) {
        const code = result.code ?? "SERVICE_UPDATE_FAILED";
        setServiceMessage(SERVICE_ERROR[code] ?? "Не удалось добавить услугу.");
        return;
      }
      event.currentTarget.reset();
      setServiceMessage("Услуга добавлена.");
      router.refresh();
    } catch {
      setServiceMessage("Связь с CRM прервана. Услуга не добавлена.");
    } finally {
      setServiceBusy(false);
    }
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">Свободно — нажмите для брони</span>
          <span className="rounded-md bg-sky-100 px-2.5 py-1 text-sky-800 ring-1 ring-sky-200">Бронь — нажмите или перетащите</span>
          <span className="rounded-md bg-amber-100 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">Удержание</span>
          <span className="rounded-md bg-rose-100 px-2.5 py-1 text-rose-800 ring-1 ring-rose-200">Тех.блок / стоп-продажа</span>
        </div>
        <span className="text-muted">Перемещение всегда проходит preview и повторную серверную проверку.</span>
      </div>

      <div className="overflow-auto rounded-xl border border-gold/15 bg-white shadow-soft">
        <table className="min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-30 bg-cream">
            <tr className="border-b border-gold/15">
              <th className="sticky left-0 z-40 min-w-48 bg-cream px-3 py-3 text-left font-semibold text-emerald-deep">Номер</th>
              {dates.map((date) => (
                <th key={date} className="min-w-24 border-l border-gold/10 px-2 py-2 text-center font-medium text-muted">{shortDate(date)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.flatMap(([building, rooms]) => [
              <tr key={`header-${building}`}>
                <td colSpan={dates.length + 1} className="border-y border-gold/15 bg-emerald-deep px-3 py-2 font-semibold text-white">
                  {building} · {rooms.length} ном.
                </td>
              </tr>,
              ...rooms.map((room) => (
                <tr key={room.id} className="border-b border-gold/10 last:border-0">
                  <td className="sticky left-0 z-20 bg-white px-3 py-2 align-top shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                    <div className="font-semibold text-emerald-deep">№ {room.roomNumber}</div>
                    <div className="max-w-44 truncate text-[10px] text-muted" title={room.category}>{room.category}</div>
                    <div className="mt-0.5 text-[10px] text-muted">до {room.maxCapacity ?? "—"} гостей</div>
                    {room.operationalStatus !== "ready" ? (
                      <div className="mt-1 text-[10px] font-semibold text-amber-700">{room.operationalStatus}</div>
                    ) : null}
                  </td>
                  {dates.map((date) => {
                    const period = findPeriodForDate(room.id, data.periods, date);
                    const blocked = isRoomOperationallyBlocked(room);
                    if (!period && !blocked) {
                      return (
                        <td key={`${room.id}-${date}`} className="border-l border-gold/10 p-1">
                          <button
                            type="button"
                            onClick={() => setSelection({ kind: "new", roomId: room.id, date })}
                            onDragOver={(event) => { if (dragged) event.preventDefault(); }}
                            onDrop={(event) => onDrop(event, room, date)}
                            className={`h-11 w-full rounded-md border border-dashed px-2 text-center transition ${dragged ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"}`}
                            title="Создать бронь"
                          >
                            <span className="font-semibold">+</span> Свободно
                          </button>
                        </td>
                      );
                    }
                    if (!period) {
                      return (
                        <td key={`${room.id}-${date}`} className="border-l border-gold/10 p-1">
                          <div className="flex h-11 items-center justify-center rounded-md border border-rose-200 bg-rose-100 px-2 text-center font-medium text-rose-900">Блок</div>
                        </td>
                      );
                    }
                    return (
                      <td key={`${room.id}-${date}`} className="border-l border-gold/10 p-1">
                        <button
                          type="button"
                          draggable={isMovable(period)}
                          onDragStart={(event) => onDragStart(event, period)}
                          onDragEnd={() => setDragged(null)}
                          onClick={() => period.booking && openBooking(period)}
                          className={`h-11 w-full rounded-md border px-2 text-left text-[10px] font-semibold transition ${stateClass(period.state)} ${period.booking ? "cursor-pointer" : "cursor-default"}`}
                          title={period.label}
                        >
                          <span className="block max-w-20 truncate">{period.booking?.guestName ?? period.label}</span>
                          {period.booking?.bookingNumber ? <span className="block truncate text-[9px] font-normal opacity-75">{period.booking.bookingNumber}</span> : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>

      {selection ? (
        <div className="fixed inset-0 z-[80] bg-black/30" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-cream shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gold/15 bg-cream/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-deep">AK BERMET CRM</div>
                <h2 className="font-display text-xl font-semibold text-emerald-deep">
                  {selection.kind === "new" ? "Новая бронь" : selection.period.booking?.guestName ?? "Бронь"}
                </h2>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-full border border-gold/20 bg-white px-3 py-1.5 text-sm text-emerald-deep">Закрыть</button>
            </div>

            <div className="space-y-5 p-5">
              {selection.kind === "new" ? (
                <ManualBookingForm
                  key={`${selection.roomId}-${selection.date}`}
                  rooms={roomsForBooking}
                  initialRoomId={selection.roomId}
                  initialCheckIn={selection.date}
                  initialCheckOut={addDays(selection.date, 1)}
                  embedded
                  title="Бронь прямо из шахматки"
                  onCreated={closeDrawer}
                />
              ) : selectedBooking?.booking ? (
                <>
                  <section className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl font-semibold text-emerald-deep">{selectedBooking.booking.guestName}</div>
                        <a href={`tel:${selectedBooking.booking.guestPhone}`} className="mt-1 inline-block text-sm font-medium text-emerald-700">{selectedBooking.booking.guestPhone || "Телефон не указан"}</a>
                      </div>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                        {STATUS_LABEL[selectedBooking.booking.status] ?? selectedBooking.booking.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Бронь</div><div className="mt-1 font-semibold text-emerald-deep">{selectedBooking.booking.bookingNumber}</div></div>
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Номер</div><div className="mt-1 font-semibold text-emerald-deep">{currentRoom ? roomLabel(currentRoom) : "—"}</div></div>
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Проживание</div><div className="mt-1 font-semibold text-emerald-deep">{humanDate(selectedBooking.start)} — {humanDate(selectedBooking.end)}</div></div>
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Гости</div><div className="mt-1 font-semibold text-emerald-deep">{selectedBooking.booking.adults} взр. · {selectedBooking.booking.children} дет. · {selectedBooking.booking.extraBeds} доп.</div></div>
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Сумма</div><div className="mt-1 font-semibold text-emerald-deep">{money(selectedBooking.booking.totalAmountKgs)} сом</div></div>
                      <div className="rounded-lg bg-cream/60 p-3"><div className="text-[10px] uppercase text-muted">Предоплата 20%</div><div className="mt-1 font-semibold text-emerald-deep">{money(selectedBooking.booking.prepaymentRequiredKgs)} сом</div></div>
                    </div>
                    {selectedBooking.booking.notes ? <div className="mt-3 rounded-lg border border-gold/10 p-3 text-sm text-muted">{selectedBooking.booking.notes}</div> : null}
                  </section>

                  <section className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-emerald-deep">Дополнительные услуги</h3>
                        <p className="mt-1 text-xs text-muted">Трансфер, SPA, бассейн, питание, парковка и любые будущие услуги.</p>
                      </div>
                      <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-emerald-deep">{selectedBooking.booking.services?.length ?? 0}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(selectedBooking.booking.services ?? []).map((service) => (
                        <div key={service.id} className="flex items-center justify-between gap-3 rounded-lg border border-gold/10 bg-cream/40 p-3 text-sm">
                          <div>
                            <div className="font-semibold text-emerald-deep">{service.name}</div>
                            <div className="text-xs text-muted">{service.quantity} × {money(service.unitPriceKgs)} сом · {service.status}</div>
                          </div>
                          <div className="font-semibold text-emerald-deep">{money(service.totalAmountKgs)} сом</div>
                        </div>
                      ))}
                      {(selectedBooking.booking.services?.length ?? 0) === 0 ? <p className="text-sm text-muted">Пока дополнительных услуг нет.</p> : null}
                    </div>

                    <form onSubmit={addService} className="mt-4 space-y-3 border-t border-gold/10 pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-muted">Услуга
                          <select name="serviceCode" required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep">
                            {data.serviceCatalog.map((service) => <option key={service.id} value={service.code}>{service.name}{service.priceKgs !== null ? ` · ${money(service.priceKgs)} сом` : " · цена вручную"}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-muted">Количество
                          <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                        </label>
                        <label className="text-xs font-medium text-muted">Цена вручную, сом
                          <input name="unitPriceKgs" type="number" min="0" step="0.01" placeholder="Только для услуг без фиксированной цены" className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                        </label>
                        <label className="text-xs font-medium text-muted">Дата услуги
                          <input name="scheduledFor" type="date" className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                        </label>
                      </div>
                      <label className="block text-xs font-medium text-muted">Комментарий
                        <input name="notes" maxLength={2000} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                      </label>
                      {serviceMessage ? <p className="text-sm text-emerald-700">{serviceMessage}</p> : null}
                      <button type="submit" disabled={serviceBusy || data.serviceCatalog.length === 0} className="rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{serviceBusy ? "Добавляем…" : "+ Добавить услугу"}</button>
                    </form>
                  </section>

                  <section className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
                    <h3 className="font-display text-lg font-semibold text-emerald-deep">Переместить / изменить даты</h3>
                    <p className="mt-1 text-xs text-muted">Сначала система проверит новое размещение. Сохранение возможно только после успешного preview.</p>
                    {!isMovable(selectedBooking) ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">После заселения обычный drag-and-drop отключён. Для переселения проживающего гостя нужен отдельный операционный сценарий без переписывания истории.</div>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-medium text-muted">Новый номер
                            <select value={targetRoomId} onChange={(event) => { setTargetRoomId(event.target.value); setPlacementPreview(null); }} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep">
                              {roomsForBooking.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
                            </select>
                          </label>
                          <div />
                          <label className="text-xs font-medium text-muted">Заезд
                            <input type="date" value={moveCheckIn} onChange={(event) => { setMoveCheckIn(event.target.value); setPlacementPreview(null); }} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                          </label>
                          <label className="text-xs font-medium text-muted">Выезд
                            <input type="date" value={moveCheckOut} onChange={(event) => { setMoveCheckOut(event.target.value); setPlacementPreview(null); }} className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                          </label>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-muted">Причина / комментарий
                          <input value={moveReason} onChange={(event) => setMoveReason(event.target.value)} maxLength={1000} placeholder="Например: просьба гостя, другой корпус" className="mt-1 w-full rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
                        </label>
                        {placementMessage ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{placementMessage}</div> : null}
                        {placementPreview?.available ? (
                          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                            <div className="font-semibold">Размещение свободно ✓</div>
                            <div className="mt-1">{placementPreview.bookingNumber} → № {placementPreview.targetRoomNumber} · {placementPreview.checkIn} — {placementPreview.checkOut}</div>
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" disabled={placementBusy} onClick={() => void previewPlacement(selectedBooking)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50">{placementBusy ? "Проверяем…" : "1. Проверить"}</button>
                          <button type="button" disabled={placementBusy || !placementPreview?.available} onClick={() => void commitPlacement()} className="rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">2. Подтвердить перенос</button>
                        </div>
                      </>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
