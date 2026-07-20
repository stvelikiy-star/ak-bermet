import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { IconClock } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = {
  title: "Возврат и отмена бронирования",
  description:
    "Условия отмены бронирования и возврата предоплаты в AK BERMET: сроки, проценты возврата, комиссии и порядок обращения.",
  alternates: { canonical: "/legal/refund" },
};

export default function RefundPage() {
  return (
    <LegalPageLayout
      title="Возврат и отмена бронирования"
      intro="Понятные условия отмены бронирования и возврата предоплаты. Размер возврата зависит от того, за сколько дней до заезда отменяется бронь."
    >
      <LegalSection title="Кратко">
        <p>
          Чем раньше вы сообщаете об отмене, тем большая часть предоплаты может
          быть возвращена. Возврат всегда рассчитывается за вычетом комиссии
          банка или платёжной системы.
        </p>
      </LegalSection>

      <LegalSection title="Условия по срокам отмены">
        <div className="grid gap-4 sm:grid-cols-3">
          {LEGAL.refundTiers.map((t) => (
            <div
              key={t.term}
              className="rounded-2xl border border-gold/20 bg-white p-5 shadow-soft"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-gold-dark">
                <IconClock className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold-dark">
                {t.term}
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-emerald-deep">
                {t.result}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t.note}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="Комиссии банка и платёжных систем">
        <p>
          Из суммы возврата удерживается комиссия банка или платёжной системы,
          через которую производилась оплата. Возврат производится способом,
          согласованным с администрацией.
        </p>
      </LegalSection>

      <LegalSection title="Как запросить возврат">
        <p>
          Свяжитесь с администрацией по телефону или в WhatsApp и сообщите об
          отмене. Для обработки запроса понадобятся:
        </p>
        <LegalList items={LEGAL.refundRequestData} />
        <a
          href={LEGAL.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon size={16} className="shrink-0" />
          Написать администратору
        </a>
      </LegalSection>

      <LegalSection title="Сроки обработки">
        <p>
          Запрос на возврат рассматривается администрацией в разумные сроки.
          Фактический срок зачисления зависит от правил банка или платёжной
          системы.
        </p>
      </LegalSection>

      <LegalSection title="Спорные ситуации">
        <LegalNotice>
          <p>
            В спорных или нестандартных случаях решение принимается администрацией
            комплекса в соответствии с условиями бронирования и действующим
            законодательством Кыргызской Республики.
          </p>
        </LegalNotice>
      </LegalSection>

      <LegalSection title="Контакты">
        <LegalList
          items={[
            `Телефон / WhatsApp: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `Адрес: ${LEGAL.address}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
