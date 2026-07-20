"use client";

import { useState } from "react";
import { Field, TextInput, TextArea } from "./fields";
import FormSuccess from "./FormSuccess";
import FormError from "./FormError";
import { useLeadForm } from "./useLeadForm";
import type { LeadInput } from "@/types/lead";
import { createGeneralWhatsAppText, whatsAppToMain } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import LegalConsent from "@/components/legal/LegalConsent";

const empty = { name: "", phone: "", topic: "", message: "" };

export default function GeneralLeadForm({
  anchorId = "general-form",
}: {
  anchorId?: string;
}) {
  const [form, setForm] = useState(empty);
  const { status, errors, serverMessage, submit, reset } = useLeadForm();

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toLead = (): LeadInput => ({
    source: "website",
    interest: "general",
    name: form.name.trim(),
    phone: form.phone.trim(),
    message: [form.topic ? `Тема: ${form.topic}` : "", form.message]
      .filter(Boolean)
      .join("\n") || undefined,
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
          message="Спасибо! Ваш вопрос принят. Администратор свяжется с вами."
          whatsappUrl={whatsAppToMain(createGeneralWhatsAppText(toLead()))}
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
          Задать вопрос
        </h3>
        <p className="mt-2 text-sm text-muted">
          Оставьте контакты и вопрос — администратор свяжется с вами.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Имя" htmlFor="g-name" required error={errors.name}>
              <TextInput
                id="g-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ваше имя"
              />
            </Field>
            <Field label="Телефон" htmlFor="g-phone" required error={errors.phone}>
              <TextInput
                id="g-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+996 ..."
              />
            </Field>
          </div>

          <Field label="Тема" htmlFor="g-topic">
            <TextInput
              id="g-topic"
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="О чём вопрос?"
            />
          </Field>

          <Field label="Сообщение" htmlFor="g-msg">
            <TextArea
              id="g-msg"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Ваш вопрос…"
            />
          </Field>

          {status === "error" && <FormError message={serverMessage} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-deep px-6 py-3.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "submitting" ? "Отправляем…" : "Отправить вопрос"}
            </button>
            <a
              href={whatsAppToMain(createGeneralWhatsAppText(toLead()))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-6 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              Продолжить в WhatsApp
            </a>
          </div>

          <LegalConsent />
        </form>
      </div>
    </section>
  );
}
