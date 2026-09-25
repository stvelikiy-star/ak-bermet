import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { IconClock } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("Возврат и отмена бронирования", locale),
    description: t(
      "Условия отмены бронирования и возврата предоплаты в AK BERMET: сроки, проценты возврата, комиссии и порядок обращения.",
      locale,
    ),
    alternates: { canonical: "/legal/refund" },
  };
}

export default async function RefundPage() {
  const locale = await getLocale();

  return (
    <LegalPageLayout
      locale={locale}
      title={t("Возврат и отмена бронирования", locale)}
      intro={t(
        "Понятные условия отмены бронирования и возврата предоплаты. Размер возврата зависит от того, за сколько дней до заезда отменяется бронь.",
        locale,
      )}
    >
      <LegalSection title={t("Кратко", locale)}>
        <p>
          {t(
            "Чем раньше вы сообщаете об отмене, тем большая часть предоплаты может быть возвращена. Возврат всегда рассчитывается за вычетом комиссии банка или платёжной системы.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection title={t("Условия по срокам отмены", locale)}>
        <div className="grid gap-4 sm:grid-cols-3">
          {LEGAL.refundTiers.map((tier) => (
            <div
              key={tier.term}
              className="rounded-2xl border border-gold/20 bg-white p-5 shadow-soft"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-gold-dark">
                <IconClock className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold-dark">
                {t(tier.term, locale)}
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-emerald-deep">
                {t(tier.result, locale)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t(tier.note, locale)}
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title={t("Комиссии банка и платёжных систем", locale)}>
        <p>
          {t(
            "Из суммы возврата удерживается комиссия банка или платёжной системы, через которую производилась оплата. Возврат производится способом, согласованным с администрацией.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection title={t("Как запросить возврат", locale)}>
        <p>
          {t(
            "Свяжитесь с администрацией по телефону или в WhatsApp и сообщите об отмене. Для обработки запроса понадобятся:",
            locale,
          )}
        </p>
        <LegalList items={LEGAL.refundRequestData.map((item) => t(item, locale))} />
        <a
          href={LEGAL.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon size={16} className="shrink-0" />
          {t("Написать администратору", locale)}
        </a>
      </LegalSection>

      <LegalSection title={t("Сроки обработки", locale)}>
        <p>
          {t(
            "Запрос на возврат рассматривается администрацией в разумные сроки. Фактический срок зачисления зависит от правил банка или платёжной системы.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection title={t("Спорные ситуации", locale)}>
        <LegalNotice>
          <p>
            {t(
              "В спорных или нестандартных случаях решение принимается администрацией комплекса в соответствии с условиями бронирования и действующим законодательством Кыргызской Республики.",
              locale,
            )}
          </p>
        </LegalNotice>
      </LegalSection>

      <LegalSection title={t("Контакты", locale)}>
        <LegalList
          items={[
            `${t("Телефон / WhatsApp", locale)}: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `${t("Адрес", locale)}: ${t(LEGAL.address, locale)}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
