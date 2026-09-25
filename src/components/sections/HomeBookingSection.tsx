"use client";

import { useMemo, useState } from "react";
import PublicAvailabilitySearch, {
  type AvailabilitySelection,
} from "@/components/availability/PublicAvailabilitySearch";
import BookingLeadForm from "@/components/forms/BookingLeadForm";
import Container from "@/components/ui/Container";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

type Props = {
  locale: Locale;
};

export default function HomeBookingSection({ locale }: Props) {
  const [selection, setSelection] = useState<AvailabilitySelection | null>(null);

  const formKey = useMemo(
    () =>
      selection
        ? [
            selection.checkIn,
            selection.checkOut,
            selection.guests,
            selection.category,
            selection.building,
          ].join("|")
        : "empty",
    [selection],
  );

  return (
    <section id="home-booking" className="scroll-mt-24 bg-beige py-16 sm:py-24">
      <Container className="max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
            {t("Бронирование", locale)}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
            {t("Найдите подходящий вариант на ваши даты", locale)}
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            {t(
              "Выберите даты и количество гостей. Система покажет предварительно доступные категории, после чего выбранный вариант автоматически перенесётся в заявку администратору.",
              locale,
            )}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <PublicAvailabilitySearch
            locale={locale}
            bookingAnchorId="home-booking-form"
            onSelect={setSelection}
          />

          <BookingLeadForm
            key={formKey}
            interest="rooms"
            anchorId="home-booking-form"
            locale={locale}
            defaultCategory={selection?.category ?? ""}
            initialCheckIn={selection?.checkIn ?? ""}
            initialCheckOut={selection?.checkOut ?? ""}
            initialAdults={selection?.guests ?? 2}
            initialMessage={
              selection
                ? `${t("Выбранный вариант", locale)}: ${t(selection.category, locale)} · ${t(selection.building, locale)}`
                : ""
            }
            title={t("Заявка на бронирование", locale)}
            subtitle={t(
              "После отправки заявка поступит администратору. Конкретный номер и финальное подтверждение брони выполняются после проверки системы.",
              locale,
            )}
          />
        </div>
      </Container>
    </section>
  );
}
