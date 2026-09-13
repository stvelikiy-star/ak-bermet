"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Stay {
  bookingId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  roomUnitId: string;
  roomNumber: string;
  buildingName: string;
}
interface QrItem {
  id: string;
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  roomUnitId: string;
  roomNumber: string;
  buildingName: string;
  label: string;
  expiresAt: string;
  createdAt: string;
  url?: string;
  qrDataUrl?: string;
}
interface GuestRequest {
  id: string;
  roomNumber: string;
  buildingName: string;
  requestType: string;
  message: string | null;
  status: string;
  createdAt: string;
}
function stayKey(bookingId: string, roomUnitId: string) {
  return `${bookingId}:${roomUnitId}`;
}
export default function ManagerQrPanel({ stays }: { stays: Stay[] }) {
  const [items, setItems] = useState<QrItem[]>([]);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [busyStay, setBusyStay] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const loadGuestService = useCallback(async () => {
    try {
      const [qrResponse, requestResponse] = await Promise.all([
        fetch("/api/manager/guest-qr", { cache: "no-store" }),
        fetch("/api/manager/guest-requests", { cache: "no-store" }),
      ]);
      const [qrBody, requestBody] = await Promise.all([qrResponse.json(), requestResponse.json()]);
      if (qrBody.ok) setItems(qrBody.items ?? []);
      if (requestBody.ok) setRequests(requestBody.items ?? []);
    } catch {
      setMessage("Не удалось прочитать данные гостевого сервиса.");
    }
  }, []);
  useEffect(() => {
    void loadGuestService();
    const timer = window.setInterval(() => void loadGuestService(), 30000);
    return () => window.clearInterval(timer);
  }, [loadGuestService]);

  const activeByStay = useMemo(
    () => new Map(items.map((item) => [stayKey(item.bookingId, item.roomUnitId), item])),
    [items],
  );

  async function createQr(stay: Stay) {
    const key = stayKey(stay.bookingId, stay.roomUnitId);
    setBusyStay(key);
    setMessage("");
    try {
      const response = await fetch("/api/manager/guest-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: stay.bookingId,
          roomUnitId: stay.roomUnitId,
          label: `${stay.bookingNumber} · ${stay.guestName} · № ${stay.roomNumber}`,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        setMessage(`Не удалось создать QR для брони ${stay.bookingNumber}, номер ${stay.roomNumber}.`);
        return;
      }
      setItems((current) => [
        body.item,
        ...current.filter((item) => stayKey(item.bookingId, item.roomUnitId) !== key),
      ]);
    } catch {
      setMessage("Сеть недоступна. Повторите попытку.");
    } finally {
      setBusyStay(null);
    }
  }

  async function revokeQr(item: QrItem) {
    if (!window.confirm(`Отозвать QR брони ${item.bookingNumber}, номер ${item.roomNumber}?`)) return;
    const response = await fetch("/api/manager/guest-qr", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    else setMessage("Не удалось отозвать QR.");
  }

  async function updateRequest(request: GuestRequest, status: string) {
    const response = await fetch("/api/manager/guest-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: request.id, status }),
    });
    if (response.ok) {
      setRequests((current) => status === "resolved" || status === "cancelled"
        ? current.filter((item) => item.id !== request.id)
        : current.map((item) => item.id === request.id ? { ...item, status } : item));
    } else setMessage("Не удалось обновить заявку гостя.");
  }

  function printItem(item: QrItem) {
    if (!item.qrDataUrl) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=600,height=760");
    if (!popup) return;
    popup.document.write(`<!doctype html><title>QR AK BERMET</title><style>body{font-family:Arial;text-align:center;padding:40px}img{width:320px;height:320px}p{color:#555}</style><h1>AK BERMET</h1><h2>Номер ${item.roomNumber}</h2><p>${item.guestName} · ${item.bookingNumber}</p><img src='${item.qrDataUrl}' alt='QR' /><p>Отсканируйте, чтобы связаться с персоналом</p>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <section className="space-y-4">
      {message && <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
      <section className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold text-emerald-deep">Заявки гостей</h2><p className="text-sm text-muted">Новые обращения по QR. Обновление каждые 30 секунд.</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{requests.length}</span><button type="button" onClick={() => void loadGuestService()} className="rounded-full border border-gold/30 px-3 py-1.5 text-xs font-semibold text-emerald-deep">Обновить</button></div>
        </div>
        {requests.length === 0 ? <p className="mt-4 text-sm text-muted">Активных заявок нет.</p> : <div className="mt-4 space-y-2">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/10 bg-cream/50 p-3"><div className="min-w-0"><p className="font-semibold text-emerald-deep">{request.buildingName} · № {request.roomNumber} · {request.requestType}</p><p className="text-sm text-muted">{request.message || "Без комментария"} · {new Date(request.createdAt).toLocaleString("ru-RU")}</p></div><div className="flex gap-2"><button type="button" onClick={() => updateRequest(request, "in_progress")} className="rounded-full border border-gold/30 px-3 py-1.5 text-xs font-semibold text-emerald-deep">В работу</button><button type="button" onClick={() => updateRequest(request, "resolved")} className="rounded-full bg-emerald-deep px-3 py-1.5 text-xs font-semibold text-gold-soft">Закрыть</button></div></div>)}</div>}
      </section>

      {stays.length === 0 ? <p className="rounded-xl border border-gold/15 bg-white p-5 text-sm text-muted shadow-soft">Нет подтверждённых или заселённых броней, для которых сейчас можно выпустить гостевой QR.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stays.map((stay) => {
        const key = stayKey(stay.bookingId, stay.roomUnitId);
        const item = activeByStay.get(key);
        return (<article key={key} className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-emerald-deep">{stay.guestName}</p><p className="text-sm text-muted">{stay.bookingNumber} · {stay.buildingName} · № {stay.roomNumber}</p><p className="mt-1 text-xs text-muted">{stay.checkIn} → {stay.checkOut} · {stay.status === "checked_in" ? "Заселён" : "Подтверждён"}</p><p className="mt-1 text-xs text-muted">{item ? `QR активен до ${new Date(item.expiresAt).toLocaleString("ru-RU")}` : "QR ещё не создан"}</p></div><span className={item ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"}>{item ? "Активен" : "Нет QR"}</span></div>
          {item?.qrDataUrl ? <img src={item.qrDataUrl} alt={`QR брони ${stay.bookingNumber}`} className="mx-auto my-4 h-48 w-48 rounded-lg border border-gold/15 bg-white p-2" /> : <div className="my-4 flex h-48 items-center justify-center rounded-lg bg-cream text-center text-sm text-muted">Создайте QR<br />для этой брони и номера.</div>}
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => createQr(stay)} disabled={busyStay === key} className="rounded-full bg-emerald-deep px-3 py-2 text-xs font-semibold text-gold-soft disabled:opacity-60">{busyStay === key ? "Создаём…" : item ? "Перевыпустить" : "Создать QR"}</button>{item?.qrDataUrl && <button type="button" onClick={() => printItem(item)} className="rounded-full border border-gold/30 px-3 py-2 text-xs font-semibold text-emerald-deep">Печать</button>}{item && <button type="button" onClick={() => revokeQr(item)} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Отозвать</button>}</div>
        </article>);
      })}</div>}
    </section>
  );
}
