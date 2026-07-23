"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconUsers,
  IconBed,
  IconBed2,
  IconGift,
  IconWaves,
  IconShield,
  IconClock,
} from "@/components/ui/icons";

const NAV = [
  { href: "/manager", label: "Обзор", icon: IconCalendar },
  { href: "/manager/leads", label: "Заявки", icon: IconUsers },
  { href: "/manager/availability", label: "Занятость", icon: IconBed },
  { href: "/manager/rooms", label: "Номерной фонд", icon: IconBed2 },
  { href: "/manager/operations", label: "Операции", icon: IconClock },
  { href: "/manager/payments", label: "Оплаты", icon: IconGift },
  { href: "/manager/reports", label: "Отчёты", icon: IconWaves },
  { href: "/manager/settings", label: "Настройки", icon: IconShield },
];

export default function ManagerSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2">
        <p className="font-display text-lg font-semibold text-white">
          AK BERMET
        </p>
        <p className="text-[11px] tracking-wider2 text-gold-soft">
          КАБИНЕТ МЕНЕДЖЕРА
        </p>
      </div>
      {NAV.map((item) => {
        const active =
          item.href === "/manager"
            ? pathname === "/manager"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-gold/15 text-gold-soft ring-1 ring-gold/30"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
