"use client";

import { useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { faqs } from "@/data/faq";
import { IconChevronDown } from "@/components/ui/icons";

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gold/15 bg-milk shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-emerald-deep">{q}</span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-gold-dark transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const left = faqs.filter((_, i) => i % 2 === 0);
  const right = faqs.filter((_, i) => i % 2 === 1);

  return (
    <section id="faq" className="bg-beige py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Вопросы и ответы"
          title="Частые вопросы"
          className="mb-10 sm:mb-14"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-6">
          <div className="space-y-4">
            {left.map((f) => (
              <Item key={f.q} {...f} />
            ))}
          </div>
          <div className="space-y-4">
            {right.map((f) => (
              <Item key={f.q} {...f} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
