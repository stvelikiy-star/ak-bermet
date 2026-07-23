"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconShield } from "@/components/ui/icons";
import {
  createSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/browser-client";

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}

function StaffLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Разрешаем только локальные пути — защита от open redirect через ?from=.
  const rawFrom = params.get("from");
  const from = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/manager";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseAuthConfigured();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase Auth не настроен. Обратитесь к администратору.");
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("Неверный email или пароль");
        return;
      }
      router.push(from);
      router.refresh();
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
            Вход для персонала
          </h1>
          <p className="mt-1 text-sm text-muted">AK BERMET — SPA & WELLNESS</p>
        </div>

        {!configured ? (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            Supabase Auth не настроен: заполните NEXT_PUBLIC_SUPABASE_URL и
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY в .env.local. Обратитесь к
            администратору.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-emerald-deep"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@akbermet.kg"
                className="w-full rounded-xl border border-gold/20 bg-cream px-4 py-3 text-sm text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-emerald-deep"
              >
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gold/20 bg-cream px-4 py-3 text-sm text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-full bg-emerald-deep px-6 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-muted">
          Резервный вход по PIN (устаревший способ):{" "}
          <Link
            href="/manager/login"
            className="font-semibold text-emerald-deep underline underline-offset-2"
          >
            /manager/login
          </Link>
        </p>
      </div>
    </div>
  );
}
