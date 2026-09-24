"use client";

import { useEffect } from "react";

export default function PremiumMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main > section:not(#top)")
    );

    if (reduced) {
      root.classList.remove("ak-motion-ready");
      sections.forEach((section) => {
        section.classList.remove("ak-reveal");
        section.classList.add("ak-reveal-visible");
      });
      return;
    }

    root.classList.add("ak-motion-ready");
    sections.forEach((section) => section.classList.add("ak-reveal"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).classList.add("ak-reveal-visible");
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08,
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      root.classList.remove("ak-motion-ready");
      sections.forEach((section) => {
        section.classList.remove("ak-reveal", "ak-reveal-visible");
      });
    };
  }, []);

  return null;
}
