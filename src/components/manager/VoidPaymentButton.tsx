"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VoidPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function voidPayment() {
    if (busy) return;
    const reason = window.prompt("Причина аннулирования записи оплаты (обязательно):")?.trim() ?? "";
    if (!reason) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/manager/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", paymentId, reason }),
      });
      const result = (await response.json()) as { ok?: boolean; code?: string };
      if (!response.ok || !result.ok) {
        setError(result.code === "PAYMENT_ALREADY_VOID" ? "Эта запись уже аннулирована." : "Не удалось аннулировать запись.");
        return;
      }
      router.refresh();
    } catch {
      setError("Связь с CRM прервана.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button type="button" onClick={voidPayment} disabled={busy} className="text-xs font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 disabled:opacity-50">
        {busy ? "Аннулируем…" : "Аннулировать запись"}
      </button>
      {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
    </div>
  );
}
