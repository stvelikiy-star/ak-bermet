import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = {
  title: "Возврат и отмена бронирования",
  description:
    "Статус условий отмены бронирования и возврата предоплаты AK BERMET и контакты администрации.",
  alternates: { canonical: "/legal/refund" },
};

export default function RefundPage() {
  return (
    <LegalPageLayout
      title="Возврат и отмена бронирования"
      intro="На этой странице публикуются только подтверждённые условия AK BERMET. Неподтверждённые старые правила намеренно не используются."
    >
      <LegalSection title="Текущий статус">
        <LegalNotice title="Условия требуют финального утверждения">
          <p>{LEGAL.refundStatus}</p>
        </LegalNotice>
        <p>
          До утверждения финальной редакции сайт не указывает проценты возврата,
          сроки удержания или комиссии как действующие правила AK BERMET.
        </p>
      </LegalSection>

      <LegalSection title="Изменение или отмена бронирования">
        <p>
          Для изменения или отмены уже оформленной брони свяжитесь с
          администрацией. Администратор проверит конкретную бронь и сообщит
          применимые к ней подтверждённые условия.
        </p>
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
