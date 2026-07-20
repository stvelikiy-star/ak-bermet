"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE } from "@/data/site";

/**
 * Логотип AK BERMET.
 *
 * Replace with real AK BERMET SPA & WELLNESS logo when asset is available.
 * Реальный логотип лежит в: /public/images/brand/logo-ak-bermet.png
 * (горизонтальная компоновка: знак + «AK BERMET / SPA & WELLNESS», золото, прозрачный фон).
 *
 * Доступные ассеты в /public/images/brand/:
 *   logo-ak-bermet.png          — основной, золотой, горизонтальный (используется ниже)
 *   logo-ak-bermet-light.png    — кремово-белый вариант для очень тёмного фона
 *   logo-ak-bermet-stacked.png  — вертикальная компоновка (знак сверху, текст снизу)
 *   logo-mark.png               — только знак (волна + солнце)
 *
 * Если PNG не загрузится (нет файла / недоступен путь) — автоматически
 * показывается фирменный текстовый fallback, поэтому сайт не ломается.
 */
const LOGO_SRC = "/images/brand/logo-ak-bermet.png";

export default function Logo({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const [imgError, setImgError] = useState(false);

  const text = variant === "light" ? "text-white" : "text-emerald-deep";
  const sub = variant === "light" ? "text-gold-soft" : "text-gold-dark";

  return (
    <Link
      href="/"
      className="group flex items-center gap-3"
      aria-label="AK BERMET — на главную"
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt="AK BERMET — SPA & Wellness"
          // Адаптивная высота: компактно на mobile, крупнее на десктопе.
          className="h-9 w-auto sm:h-10 lg:h-11"
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          {/* Fallback: монограмма (солнце над водной гладью) + текст */}
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-11 w-11">
              <circle cx="24" cy="19" r="6.5" fill="#C2A059" />
              <g stroke="#C2A059" strokeWidth="1.8" strokeLinecap="round">
                <path d="M24 6v3.5M24 28.5V32M37 19h-3.5M14.5 19H11M33 10l-2.4 2.4M17.4 25.6 15 28M33 28l-2.4-2.4M17.4 12.4 15 10" />
              </g>
              <path
                d="M8 38c3-2.5 5-2.5 8 0s5 2.5 8 0 5-2.5 8 0"
                stroke="#D8BE83"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M8 42c3-2.5 5-2.5 8 0s5 2.5 8 0 5-2.5 8 0"
                stroke="#C2A059"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="leading-none">
            <span
              className={`block font-display text-xl font-semibold tracking-wide ${text}`}
            >
              {SITE.name}
            </span>
            <span
              className={`mt-1 block text-[10px] font-medium tracking-wider2 ${sub}`}
            >
              {SITE.tagline}
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
