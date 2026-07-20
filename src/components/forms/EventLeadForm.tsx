"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, Checkbox } from "./fields";
import FormSuccess from "./FormSuccess";
import FormError from "./FormError";
import { useLeadForm } from "./useLeadForm";
import { halls } from "@/data/events";
import type { LeadInput } from "@/types/lead";
import { createEventWhatsAppText, whatsAppToMain } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import LegalConsent from "@/components/legal/LegalConsent";

const empty = {
  name: "",
  phone: "",
  date: "",
  eventType: "",
  guestsCount: "",
  hallSize: "",
  needsAccommodation: false,
  needsFood: false,
  needsCoffeeBreak: false,
  message: "",
};

export default function EventLeadForm({ anchorId = "event-form" }: { anchorId?: string }) {
  const [form, setForm] = useState(empty);
  const { status, errors, serverMessage, submit, reset } = useLeadForm();

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const composedMessage = () => {
    const extras: string[] = [];
    if (form.needsAccommodation) extras.push("нужно проживание");
    if (form.needsFood) extras.push("нужно питание");
    if (form.needsCoffeeBreak) extras.push("нужен кофе-брейк");
    const tail = extras.length ? `Доп.: ${extras.join(", ")}.` : "";
    return [form.message, tail].filter(Boolean).join(" ").trim() || undefined;
  };

  const toLead = (): LeadInput => ({
    source: "website",
    interest: "events",
    name: form.name.trim(),
    phone: form.phone.trim(),
    checkIn: form.date || undefined,
    eventType: form.eventType || undefined,
    guestsCount: form.guestsCount ? Number(form.guestsCount) : undefined,
    hallSize: form.hallSize || undefined,
    message: composedMessage(),
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
          message="Заявка на мероприятие принята. Администратор уточнит зал, питание, проживание и условия."
          whatsappUrl={whatsAppToMain(createEventWhatsAppText(toLead()))}
          onReset={() => {
            setForm(empty);
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
          Заявка на мероприятие
        </h3>
        <p className="mt-2 text-sm text-muted">
          Расскажите про формат — подготовим условия по залу, питанию и
          проживанию.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Имя" htmlFor="e-name" required error={errors.name}>
              <TextInput
                id="e-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ваше имя"
              />
            </Field>
            <Field label="Телефон" htmlFor="e-phone" required error={errors.phone}>
              <TextInput
                id="e-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+996 ..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Дата мероприятия" htmlFor="e-date">
              <TextInput
                id="e-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Тип мероприятия" htmlFor="e-type">
              <TextInput
                id="e-type"
                value={form.eventType}
                onChange={(e) => set("eventType", e.target.value)}
                placeholder="семинар, тренинг, корпоратив…"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Количество гостей"
              htmlFor="e-guests"
              error={errors.guestsCount}
            >
              <TextInput
                id="e-guests"
                type="number"
                min={1}
                value={form.guestsCount}
                onChange={(e) => set("guestsCount", e.target.value)}
              />
            </Field>
            <Field label="Нужный зал" htmlFor="e-hall">
              <Select
                id="e-hall"
                value={form.hallSize}
                onChange={(e) => set("hallSize", e.target.value)}
              >
                <option value="">Подобрать зал</option>
                {halls.map((h) => (
                  <option key={h.capacity} value={h.capacity}>
                    {h.capacity}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Checkbox
              id="e-acc"
              label="Нужно проживание"
              checked={form.needsAccommodation}
              onChange={(e) => set("needsAccommodation", e.target.checked)}
            />
            <Checkbox
              id="e-food"
              label="Нужно питание"
              checked={form.needsFood}
              onChange={(e) => set("needsFood", e.target.checked)}
            />
            <Checkbox
              id="e-coffee"
              label="Нужен кофе-брейк"
              checked={form.needsCoffeeBreak}
              onChange={(e) => set("needsCoffeeBreak", e.target.checked)}
            />
          </div>

          <Field label="Комментарий" htmlFor="e-msg">
            <TextArea
              id="e-msg"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Детали мероприятия, оборудование, тайминг…"
            />
          </Field>

          {status === "error" && <FormError message={serverMessage} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-deep px-6 py-3.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "submitting"
                ? "Отправляем…"
                : "Отправить заявку на мероприятие"}
            </button>
            <a
              href={whatsAppToMain(createEventWhatsAppText(toLead()))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-6 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              Продолжить в WhatsApp
            </a>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Условия и доступность залов подтверждает администратор после проверки.
          </p>

          <LegalConsent />
        </form>
      </div>
    </section>
  );
}
