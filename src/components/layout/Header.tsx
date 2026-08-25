"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";
import { SITE, WA } from "@/data/site";
import { MAIN_NAV } from "@/data/navigation";
import {

  IconMenu,
  IconClose,
} from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export default function Header({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Закрываем мобильное меню при переходе
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-emerald-deep/95 shadow-soft backdrop-blur"
          : "bg-emerald-deep/85 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Logo variant="light" />

        {/* Навигация — десктоп */}
        <nav className="hidden items-center gap-5 xl:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] font-medium uppercase tracking-wide transition-colors hover:text-gold-soft ${
                isActive(item.href) ? "text-gold-soft" : "text-white/80"
              }`}
            >
              {t(item.label, locale)}
            </Link>
          ))}
        </nav>

        {/* Правый блок */}
        <div className="flex items-center gap-2.5">
          <a
            href={WA.booking}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-2.5 text-[13px] font-semibold text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5 sm:flex"
          >
            <WhatsAppIcon size={16} className="shrink-0" />
            <span className="leading-tight">
              {t("Забронировать", locale)}
              <span className="block text-[10px] font-medium opacity-80">
                WhatsApp
              </span>
            </span>
          </a>

          {/* Короткая кнопка «Бронь» — мобайл */}
          <a
            href={WA.booking}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-soft to-gold px-4 py-2 text-xs font-semibold text-emerald-deep sm:hidden"
          >
            <WhatsAppIcon size={16} className="shrink-0" />
            {t("Бронь", locale)}
          </a>

          {/* Переключатель языка */}
          <div className="hidden lg:block">
            <LanguageSwitcher locale={locale} />
          </div>

          {/* Бургер */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white xl:hidden"
            aria-label={open ? t("Закрыть меню", locale) : t("Открыть меню", locale)}
            aria-expanded={open}
          >
            {open ? (
              <IconClose className="h-5 w-5" />
            ) : (
              <IconMenu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      <div
        className={`overflow-hidden border-t border-white/10 bg-emerald-deep transition-[max-height] duration-300 xl:hidden ${
          open ? "max-h-[88vh]" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors hover:bg-white/5 hover:text-gold-soft ${
                isActive(item.href) ? "text-gold-soft" : "text-white/85"
              }`}
            >
              {t(item.label, locale)}
            </Link>
          ))}
          <a
            href={WA.booking}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-3 text-sm font-semibold text-emerald-deep"
          >
            <WhatsAppIcon size={16} className="shrink-0" />
            {t("Забронировать через WhatsApp", locale)}
          </a>
          <p className="px-4 pt-3 text-xs text-white/50">{SITE.phoneDisplay}</p>
          <div className="mt-3 border-t border-white/10 px-4 pt-4">
            <LanguageSwitcher locale={locale} variant="mobile" />
          </div>
        </nav>
      </div>
    </header>
  );
}
