"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconMenu, IconClose } from "@/components/ui/icons";
import ManagerSidebar from "./ManagerSidebar";

export default function ManagerHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch("/api/manager/logout", { method: "POST" });
    } finally {
      router.push("/manager/login");
      router.refresh();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold/15 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Меню"
            className="rounded-lg border border-gold/20 p-2 text-emerald-deep lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold text-emerald-deep">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-emerald-deep/5 px-3 py-1 text-[11px] font-medium text-emerald-deep ring-1 ring-gold/20 sm:inline">
            Демо-режим
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-gold/30 px-4 py-1.5 text-xs font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Мобильный сайдбар */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-emerald-deep">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="absolute right-3 top-3 text-white/70"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <ManagerSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
