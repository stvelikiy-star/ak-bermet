"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconShield } from "@/components/ui/icons";

export default function ManagerLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/manager/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/manager");
        router.refresh();
      } else {
        setError(data.message || "Неверный PIN");
      }
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-deep to-emerald-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-milk p-8 shadow-float">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep">
            <IconShield className="h-7 w-7" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-emerald-deep">
            Резервный вход (PIN)
          </h1>
          <p className="mt-1 text-sm text-muted">AK BERMET — SPA & WELLNESS</p>
        </div>

        <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          Устаревший способ входа. Основной вход для персонала —{" "}
          <Link href="/staff/login" className="font-semibold underline underline-offset-2">
            /staff/login
          </Link>{" "}
          (Supabase Auth). PIN оставлен как аварийный резерв.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="pin"
              className="mb-1.5 block text-sm font-medium text-emerald-deep"
            >
              PIN-код
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-gold/20 bg-cream px-4 py-3 text-center text-lg tracking-widest text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-full bg-emerald-deep px-6 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          Демо-доступ. Используйте только если Supabase Auth недоступен.
        </p>
      </div>
    </div>
  );
}
