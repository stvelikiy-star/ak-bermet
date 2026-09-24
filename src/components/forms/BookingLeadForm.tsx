"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, Checkbox } from "./fields";
import FormSuccess from "./FormSuccess";
import FormError from "./FormError";
import { useLeadForm } from "./useLeadForm";
import { roomCategories } from "@/data/rooms";
import type { LeadInput, LeadInterest } from "@/types/lead";
import { createBookingWhatsAppText, whatsAppToMain } from "@/lib/whatsapp";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import LegalConsent from "@/components/legal/LegalConsent";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

type Props = {
  interest?: LeadInterest;
  defaultCategory?: string;
  anchorId?: string;
  title?: string;
  subtitle?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialMessage?: string;
  locale?: Locale;
};

const empty = {
  name: "",
  phone: "",
  checkIn: "",
  checkOut: "",
  adults: "2",
  children: "0",
  childrenAges: "",
  roomCategory: "",
  wantsDoubleBed: false,
  needsExtraBed: false,
  needsWifi: false,
  needsLowerFloor: false,
  message: "",
};

export default function BookingLeadForm({
  interest = "rooms",
  defaultCategory = "",
  anchorId = "booking-form",
  title = "Оставить заявку на бронирование",
  subtitle = "Администратор проверит наличие и свяжется с вами для подтверждения.",
  initialCheckIn = "",
  initialCheckOut = "",
  initialAdults = 2,
  initialMessage = "",
  locale = "ru",
}: Props) {
  const initialForm = () => ({
    ...empty,
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    adults: String(Math.max(1, initialAdults || 1)),
    roomCategory: defaultCategory,
    message: initialMessage,
  });
  const [form, setForm] = useState(initialForm);
  const { status, errors, serverMessage, submit, reset } = useLeadForm();

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toLead = (): LeadInput => ({
    source: "website",
    interest,
    name: form.name.trim(),
    phone: form.phone.trim(),
    checkIn: form.checkIn || undefined,
    checkOut: form.checkOut || undefined,
    adults: form.adults ? Number(form.adults) : undefined,
    children: form.children ? Number(form.children) : undefined,
    childrenAges: form.childrenAges || undefined,
    roomCategory: form.roomCategory || undefined,
    wantsDoubleBed: form.wantsDoubleBed || undefined,
    needsExtraBed: form.needsExtraBed || undefined,
    needsWifi: form.needsWifi || undefined,
    needsLowerFloor: form.needsLowerFloor || undefined,
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
          message={t("Заявка принята предварительно. Администратор проверит наличие и свяжется с вами для подтверждения.", locale)}
          whatsappUrl={whatsAppToMain(createBookingWhatsAppText(toLead()))}
          onReset={() => {
            setForm(initialForm());
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
          {t(title, locale)}
        </h3>
        <p className="mt-2 text-sm text-muted">{t(subtitle, locale)}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("Имя", locale)} htmlFor="b-name" required error={errors.name}>
              <TextInput
                id="b-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("Ваше имя", locale)}
                autoComplete="name"
              />
            </Field>
            <Field label={t("Телефон", locale)} htmlFor="b-phone" required error={errors.phone}>
              <TextInput
                id="b-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+996 ..."
                autoComplete="tel"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("Дата заезда", locale)} htmlFor="b-in">
              <TextInput
                id="b-in"
                type="date"
                value={form.checkIn}
                onChange={(e) => set("checkIn", e.target.value)}
              />
            </Field>
            <Field label={t("Дата выезда", locale)} htmlFor="b-out" error={errors.checkOut}>
              <TextInput
                id="b-out"
                type="date"
                value={form.checkOut}
                onChange={(e) => set("checkOut", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t("Взрослые", locale)} htmlFor="b-adults" error={errors.adults}>
              <TextInput
                id="b-adults"
                type="number"
                min={1}
                value={form.adults}
                onChange={(e) => set("adults", e.target.value)}
              />
            </Field>
            <Field label={t("Дети", locale)} htmlFor="b-children">
              <TextInput
                id="b-children"
                type="number"
                min={0}
                value={form.children}
                onChange={(e) => set("children", e.target.value)}
              />
            </Field>
            <Field label={t("Возраст детей", locale)} htmlFor="b-ages">
              <TextInput
                id="b-ages"
                value={form.childrenAges}
                onChange={(e) => set("childrenAges", e.target.value)}
                placeholder={t("напр. 4, 9", locale)}
              />
            </Field>
          </div>

          <Field label={t("Категория номера", locale)} htmlFor="b-cat">
            <Select
              id="b-cat"
              value={form.roomCategory}
              onChange={(e) => set("roomCategory", e.target.value)}
            >
              <option value="">{t("Не выбрано / подберите вариант", locale)}</option>
              {roomCategories.map((c) => (
                <option key={c.title} value={c.title}>
                  {t(c.title, locale)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Checkbox
              id="b-double"
              label={t("Нужна двуспальная кровать", locale)}
              checked={form.wantsDoubleBed}
              onChange={(e) => set("wantsDoubleBed", e.target.checked)}
            />
            <Checkbox
              id="b-extra"
              label={t("Нужно дополнительное место", locale)}
              checked={form.needsExtraBed}
              onChange={(e) => set("needsExtraBed", e.target.checked)}
            />
            <Checkbox
              id="b-wifi"
              label={t("Нужен Wi-Fi", locale)}
              checked={form.needsWifi}
              onChange={(e) => set("needsWifi", e.target.checked)}
            />
            <Checkbox
              id="b-floor"
              label={t("Нужен нижний этаж", locale)}
              checked={form.needsLowerFloor}
              onChange={(e) => set("needsLowerFloor", e.target.checked)}
            />
          </div>

          <Field label={t("Комментарий", locale)} htmlFor="b-msg">
            <TextArea
              id="b-msg"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={t("Пожелания по номеру, виду, питанию и т. д.", locale)}
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
              href={whatsAppToMain(createBookingWhatsAppText(toLead()))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-6 py-3.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
            >
              <WhatsAppIcon size={16} className="shrink-0" />
              {t("Продолжить в WhatsApp", locale)}
            </a>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            {t("Финальное наличие и бронь подтверждает администратор после проверки системы и предоплаты 20%.", locale)}
          </p>

          <LegalConsent />
        </form>
      </div>
    </section>
  );
}
