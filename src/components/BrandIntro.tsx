"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "akbermet_brand_intro_seen";

export default function BrandIntro() {
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (
        sessionStorage.getItem(SESSION_KEY) === "1" ||
        document.documentElement.classList.contains("ak-intro-seen")
      ) {
        setDone(true);
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sessionStorage.setItem(SESSION_KEY, "1");
        document.documentElement.classList.add("ak-intro-seen");
        setDone(true);
        return;
      }

      const fadeTimer = window.setTimeout(() => {
        setClosing(true);
      }, 1100);

      const closeTimer = window.setTimeout(() => {
        sessionStorage.setItem(SESSION_KEY, "1");
        document.documentElement.classList.add("ak-intro-seen");
        setDone(true);
      }, 1650);

      return () => {
        window.clearTimeout(fadeTimer);
        window.clearTimeout(closeTimer);
      };
    } catch {
      setDone(true);
    }
  }, []);

  if (done) return null;

  return (
    <div
      className={`ak-brand-intro fixed inset-0 z-[100] overflow-hidden bg-emerald-deep transition-opacity duration-500 ${
        closing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 scale-[1.03] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero/home-hero.png')" }}
      />
      <div className="absolute inset-0 bg-emerald-deep/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep via-emerald-deep/35 to-emerald-deep/70" />

      <div className="relative flex min-h-full items-center justify-center px-6">
        <div className="text-center">
          <Image
            src="/images/brand/logo-ak-bermet.png"
            alt=""
            width={520}
            height={180}
            priority
            className="mx-auto h-auto w-[230px] sm:w-[330px]"
          />

          <div className="mx-auto mt-7 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-soft sm:text-xs">
            SPA & WELLNESS
          </p>

          <p className="mt-2 text-xs tracking-[0.18em] text-white/65">
            ИССЫК-КУЛЬ
          </p>
        </div>
      </div>
    </div>
  );
}
