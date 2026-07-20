"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select } from "./fields";
import FormSuccess from "./FormSuccess";
import FormError from "./FormError";
import { useLeadForm } from "./useLeadForm";
import type { LeadInput, LeadInterest } from "@/types/lead";
import { createSpaWhatsAppText, whatsAppToMain } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import LegalConsent from "@/components/legal/LegalConsent";

const SERVICES = ["SPA", "Горячие источники", "Бассейн", "Тренажёрный зал"];

const empty = {
  name: "",
  phone: "",
  spaService: "",
  date: "",
  guestsCount: "1",
  message: "",
};

export default function SpaLeadForm({
  interest = "spa",
  defaultService = "",
  anchorId = "spa-form",
}: {
  interest?: LeadInterest;
  defaultService?: string;
  anchorId?: string;
}) {
  const [form, setForm] = useState({ ...empty, spaService: defaultService });
  const { status, errors, serverMessage, submit, reset } = useLeadForm();

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toLead = (): LeadInput => ({
    source: "website",
    interest,
    name: form.name.trim(),
    phone: form.phone.trim(),
    spaService: form.spaService || undefined,
    checkIn: form.date || undefined,
    guestsCount: form.guestsCount ? Number(form.guestsCount) : undefined,
    message: form.message || undefined,
    preferredContact: "whatsapp",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(toLead());
  };

  if (status === "success") {
    return (
      <section id={anchorId} className="scroll-mt-28">
        <FormSuccess
          message="Заявка принята. Администратор уточнит условия посещения и свободное время."
          whatsappUrl={whatsAppToMain(createSpaWhatsAppText(toLead()))}
          onReset={() => {
            setForm({ ...empty, spaService: defaultService });
            reset();
          }}
        />
      </section>
    );
  }

  return (
    <section id={anchorId} className="scroll-mt-28">
      <div className="rounded-2xl border border-gold/20 bg-milk p-6 shadow-soft sm:p-8">
        <h3 className="font-display text-2xl font-semibold text-emerald-deep">
          Заявка на посещение
        </h3>
        <p className="mt-2 text-sm text-muted">
          Оставьте контакты — администратор подскажет свободное время и условия.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Имя" htmlFor="s-name" required error={errors.name}>
              <TextInput
                id="s-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ваше имя"
              />
            </Field>
            <Field label="Телефон" htmlFor="s-phone" required error={errors.phone}>
              <TextInput
                id="s-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+996 ..."
              />
            </Field>
          </div>

          <Field label="Что интересует" htmlFor="s-service">
            <Select
              id="s-service"
              value={form.spaService}
              onChange={(e) => set("spaService", e.target.value)}
            >
              <option value="">Выберите услугу</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Дата визита" htmlFor="s-date">
              <TextInput
                id="s-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field
              label="Количество гостей"
              htmlFor="s-guests"
              error={errors.guestsCount}
            >
              <TextInput
                id="s-guests"
                type="number"
                min={1}
                value={form.guestsCount}
                onChange={(e) => set("guestsCount", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Комментарий" htmlFor="s-msg">
            <TextArea
              id="s-msg"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Пожелания по времени, услугам…"
            />
          </Field>

          {status === "error" && <FormError message={serverMessage} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-deep px-6 py-3.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "submitting" ? "Отправляем…" : "Отправить заявку"}
            </button>
            <a
              href={whatsAppToMain(createSpaWhatsAppText(toLead()))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-6 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              Продолжить в WhatsApp
            </a>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            При наличии заболеваний рекомендуем проконсультироваться с врачом.
            Точное свободное время подтверждает администратор.
          </p>

          <LegalConsent />
        </form>
      </div>
    </section>
  );
}
