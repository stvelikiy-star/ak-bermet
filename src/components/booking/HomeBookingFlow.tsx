"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";
import PublicAvailabilitySearch, {
  type AvailabilitySelection,
} from "@/components/availability/PublicAvailabilitySearch";
import BookingLeadForm from "@/components/forms/BookingLeadForm";

export default function HomeBookingFlow() {
  const [selection, setSelection] = useState<AvailabilitySelection | null>(null);

  const selectionKey = selection
    ? [
        selection.checkIn,
        selection.checkOut,
        selection.guests,
        selection.category,
        selection.building,
      ].join("|")
    : "empty";

  return (
    <section id="home-booking" className="scroll-mt-24 bg-beige py-16 sm:py-24">
      <Container className="max-w-6xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
            Бронирование
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
            Найдите подходящий вариант на ваши даты
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Укажите даты и количество гостей. Система покажет доступные категории,
            после выбора перенесёт данные в заявку, которая поступит администратору в CRM.
          </p>
        </div>

        <PublicAvailabilitySearch
          onSelect={setSelection}
          bookingAnchorId="home-booking-form"
        />

        <div className="mt-6">
          <BookingLeadForm
            key={selectionKey}
            anchorId="home-booking-form"
            defaultCategory={selection?.category ?? ""}
            initialCheckIn={selection?.checkIn ?? ""}
            initialCheckOut={selection?.checkOut ?? ""}
            initialAdults={selection?.guests ?? 2}
            initialMessage={
              selection
                ? `Выбран предварительный вариант: ${selection.category}, ${selection.building}.`
                : ""
            }
            title={
              selection
                ? "Завершить заявку на выбранный вариант"
                : "Оставить заявку на бронирование"
            }
            subtitle={
              selection
                ? "Даты, количество гостей и категория уже перенесены из поиска. Добавьте контакты и отправьте заявку."
                : "Можно сразу оставить заявку — администратор проверит наличие и предложит подходящий вариант."
            }
          />
        </div>
      </Container>
    </section>
  );
}
