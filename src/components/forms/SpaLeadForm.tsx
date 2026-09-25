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
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

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
  locale = "ru",
}: {
  interest?: LeadInterest;
  defaultService?: string;
  anchorId?: string;
  locale?: Locale;
}) {
  const [form, setForm] = useState({ ...empty, spaService: defaultService });
  const { status, errors, serverMessage, submit, reset } = useLeadForm(locale);

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
          message={t("Заявка принята. Администратор уточнит условия посещения и свободное время.", locale)}
          locale={locale}
          whatsappUrl={whatsAppToMain(createSpaWhatsAppText(toLead(), locale))}
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
          {t("Заявка на посещение", locale)}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {t("Оставьте контакты — администратор подскажет свободное время и условия.", locale)}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("Имя", locale)} htmlFor="s-name" required error={errors.name}>
              <TextInput
                id="s-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("Ваше имя", locale)}
              />
            </Field>
            <Field label={t("Телефон", locale)} htmlFor="s-phone" required error={errors.phone}>
              <TextInput
                id="s-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+996 ..."
              />
            </Field>
          </div>

          <Field label={t("Что интересует", locale)} htmlFor="s-service">
            <Select
              id="s-service"
              value={form.spaService}
              onChange={(e) => set("spaService", e.target.value)}
            >
              <option value="">{t("Выберите услугу", locale)}</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {t(s, locale)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("Дата визита", locale)} htmlFor="s-date">
              <TextInput
                id="s-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field
              label={t("Количество гостей", locale)}
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

          <Field label={t("Комментарий", locale)} htmlFor="s-msg">
            <TextArea
              id="s-msg"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={t("Пожелания по времени, услугам…", locale)}
            />
          </Field>

          {status === "error" && <FormError message={t(serverMessage, locale)} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-deep px-6 py-3.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "submitting" ? t("Отправляем…", locale) : t("Отправить заявку", locale)}
            </button>
            <a
              href={whatsAppToMain(createSpaWhatsAppText(toLead(), locale))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-6 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              {t("Продолжить в WhatsApp", locale)}
            </a>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            {t("При наличии заболеваний рекомендуем проконсультироваться с врачом. Точное свободное время подтверждает администратор.", locale)}
          </p>

          <LegalConsent locale={locale} />
        </form>
      </div>
    </section>
  );
}
