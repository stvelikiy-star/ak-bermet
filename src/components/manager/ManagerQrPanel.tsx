"use client";
import { useEffect, useMemo, useState } from "react";
interface Room { id: string; roomNumber: string; buildingName: string; }
interface QrItem { id: string; roomUnitId: string; roomNumber: string; buildingName: string; label: string; expiresAt: string; createdAt: string; url?: string; qrDataUrl?: string; }
export default function ManagerQrPanel({ rooms }: { rooms: Room[] }) {
  const [items, setItems] = useState<QrItem[]>([]); const [busyRoom, setBusyRoom] = useState<string | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/manager/guest-qr").then((response) => response.json()).then((body) => { if (body.ok) setItems(body.items ?? []); }).catch(() => setMessage("Не удалось прочитать активные QR.")); }, []);
  const activeByRoom = useMemo(() => new Map(items.map((item) => [item.roomUnitId, item])), [items]);
  async function createQr(room: Room) {
    setBusyRoom(room.id); setMessage("");
    try {
      const response = await fetch("/api/manager/guest-qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomUnitId: room.id, label: "Номер " + room.roomNumber, expiresInDays: 365 }) });
      const body = await response.json();
      if (!response.ok || !body.ok) { setMessage("Не удалось создать QR для номера " + room.roomNumber + "."); return; }
      setItems((current) => [body.item, ...current.filter((item) => item.roomUnitId !== room.id)]);
    } catch { setMessage("Сеть недоступна. Повторите попытку."); } finally { setBusyRoom(null); }
  }
  async function revokeQr(item: QrItem) {
    if (!window.confirm("Отозвать QR для номера " + item.roomNumber + "?")) return;
    const response = await fetch("/api/manager/guest-qr", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    if (response.ok) setItems((current) => current.filter((candidate) => candidate.id !== item.id)); else setMessage("Не удалось отозвать QR.");
  }
  function printItem(item: QrItem) {
    if (!item.qrDataUrl) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=600,height=760"); if (!popup) return;
    popup.document.write("<!doctype html><title>QR AK BERMET</title><style>body{font-family:Arial;text-align:center;padding:40px}img{width:320px;height:320px}p{color:#555}</style><h1>AK BERMET</h1><h2>Номер " + item.roomNumber + "</h2><img src=\\"" + item.qrDataUrl + "\\" alt=\\"QR\\" /><p>Отсканируйте, чтобы связаться с персоналом</p>"); popup.document.close(); popup.focus(); popup.print();
  }
  return (<section className="space-y-4">{message && <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => { const item = activeByRoom.get(room.id); return (<article key={room.id} className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-emerald-deep">{room.buildingName} · № {room.roomNumber}</p><p className="mt-1 text-xs text-muted">{item ? "QR активен до " + new Date(item.expiresAt).toLocaleDateString("ru-RU") : "QR ещё не создан"}</p></div><span className={item ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"}>{item ? "Активен" : "Нет QR"}</span></div>{item?.qrDataUrl ? <img src={item.qrDataUrl} alt={"QR номера " + room.roomNumber} className="mx-auto my-4 h-48 w-48 rounded-lg border border-gold/15 bg-white p-2" /> : <div className="my-4 flex h-48 items-center justify-center rounded-lg bg-cream text-center text-sm text-muted">Создайте QR,<br />чтобы получить макет.</div>}<div className="flex flex-wrap gap-2"><button type="button" onClick={() => createQr(room)} disabled={busyRoom === room.id} className="rounded-full bg-emerald-deep px-3 py-2 text-xs font-semibold text-gold-soft disabled:opacity-60">{busyRoom === room.id ? "Создаём…" : item ? "Перевыпустить" : "Создать QR"}</button>{item?.qrDataUrl && <button type="button" onClick={() => printItem(item)} className="rounded-full border border-gold/30 px-3 py-2 text-xs font-semibold text-emerald-deep">Печать</button>}{item && <button type="button" onClick={() => revokeQr(item)} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Отозвать</button>}</div></article>); })}</div></section>);
}
