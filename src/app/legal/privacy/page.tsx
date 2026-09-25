import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("Политика конфиденциальности", locale),
    description: t(
      "Политика конфиденциальности AK BERMET: какие данные собираются, для чего используются, где хранятся и какие права есть у гостя.",
      locale,
    ),
    alternates: { canonical: "/legal/privacy" },
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();

  return (
    <LegalPageLayout
      locale={locale}
      title={t("Политика конфиденциальности", locale)}
      intro={t(
        "Как комплекс AK BERMET собирает, использует и защищает персональные данные гостей при оформлении заявок и бронировании.",
        locale,
      )}
    >
      <LegalSection index={1} title={t("Какие данные собираются", locale)}>
        <p>{t("При оформлении заявки комплекс может собирать:", locale)}</p>
        <LegalList
          items={[
            t("имя гостя;", locale),
            t("номер телефона;", locale),
            t("email, если он указан;", locale),
            t("даты заезда и выезда;", locale),
            t("количество гостей;", locale),
            t("комментарии и пожелания к заявке;", locale),
            t("технические данные сайта (например, обезличенная статистика посещений).", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={2} title={t("Для чего используются данные", locale)}>
        <LegalList
          items={[
            t("обработка заявки;", locale),
            t("связь с гостем;", locale),
            t("подтверждение бронирования;", locale),
            t("улучшение сервиса;", locale),
            t("выполнение требований законодательства.", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={3} title={t("Где могут храниться данные", locale)}>
        <LegalList
          items={[
            t("на сайте комплекса;", locale),
            t("в CRM / manager-разделе для обработки заявок;", locale),
            t("в Google Sheets, если такая интеграция подключена;", locale),
            t("в мессенджерах, если гость самостоятельно пишет в WhatsApp.", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={4} title={t("Кто имеет доступ к данным", locale)}>
        <LegalList
          items={[
            t("администрация комплекса;", locale),
            t("уполномоченные сотрудники;", locale),
            t("технические специалисты — только при необходимости обслуживания.", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={5} title={t("Срок хранения", locale)}>
        <p>
          {t(
            "Данные хранятся в течение срока, необходимого для обработки заявки, оказания услуг и выполнения требований законодательства, после чего могут быть удалены или обезличены.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={6} title={t("Меры защиты", locale)}>
        <LegalNotice title={t("О защите данных", locale)}>
          <p>
            {t(
              "Мы принимаем разумные организационные и технические меры для защиты персональных данных. При этом ни один способ передачи или хранения данных не может гарантировать абсолютную безопасность.",
              locale,
            )}
          </p>
        </LegalNotice>
      </LegalSection>

      <LegalSection index={7} title={t("Права пользователя", locale)}>
        <p>{t("Гость вправе:", locale)}</p>
        <LegalList
          items={[
            t("запросить информацию об обработке своих данных;", locale),
            t("запросить уточнение или исправление данных;", locale),
            t("запросить удаление данных, если это не противоречит требованиям закона.", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={8} title={t("Контакты для обращения", locale)}>
        <LegalList
          items={[
            `${LEGAL.brand} (${t(LEGAL.entity, locale)})`,
            `${t("Телефон / WhatsApp", locale)}: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `${t("Адрес", locale)}: ${t(LEGAL.address, locale)}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
