import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL, BOOKING_RULES } from "@/data/legal";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("Условия использования сайта", locale),
    description: t(
      "Условия использования сайта AK BERMET: назначение сайта, заявки и формы, AI-ассистент, ограничение ответственности и внешние сервисы.",
      locale,
    ),
    alternates: { canonical: "/legal/terms" },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();

  return (
    <LegalPageLayout
      locale={locale}
      title={t("Условия использования сайта", locale)}
      intro={t(
        "Правила использования сайта AK BERMET, статус информации, заявок и AI-ассистента.",
        locale,
      )}
    >
      <LegalSection index={1} title={t("Назначение сайта", locale)}>
        <p>
          {t(
            "Сайт AK BERMET предназначен для информирования гостей об услугах комплекса и сбора заявок на проживание, посещение источников, SPA и проведение мероприятий.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={2} title={t("Информация на сайте", locale)}>
        <LegalNotice>
          <p>
            {t(
              "Информация на сайте носит справочный характер и может быть изменена администрацией.",
              locale,
            )}
          </p>
        </LegalNotice>
        <p>
          {t(
            "Цены, наличие, расписание и условия услуг могут обновляться. Финальные условия подтверждает администратор.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={3} title={t("Заявки и формы", locale)}>
        <p>
          {t(
            "Формы на сайте помогают собрать заявку с пожеланиями гостя. Отправка заявки не является подтверждением бронирования.",
            locale,
          )}
        </p>
        <LegalList items={BOOKING_RULES.map((rule) => t(rule, locale))} />
      </LegalSection>

      <LegalSection index={4} title={t("AI-ассистент", locale)}>
        <LegalNotice title={t("Статус AI-ассистента", locale)}>
          <p>
            {t(
              "AI-ассистент используется для первичной консультации и сбора заявки, но не является официальным подтверждением бронирования, наличия мест, стоимости или оплаты.",
              locale,
            )}
          </p>
        </LegalNotice>
        <p>
          {t(
            "Финальные условия проживания, стоимости, наличия и оплаты подтверждаются администратором.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={5} title={t("Ограничение ответственности", locale)}>
        <p>
          {t(
            "Комплекс не несёт ответственности за решения, принятые гостем исключительно на основании справочной информации сайта или ответов AI-ассистента без подтверждения администратора.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={6} title={t("Ссылки на сторонние сервисы", locale)}>
        <p>
          {t(
            "Сайт может содержать ссылки на сторонние сервисы (например, карты 2ГИС, WhatsApp). Комплекс не отвечает за содержание и политику сторонних ресурсов.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={7} title={t("WhatsApp и внешние каналы связи", locale)}>
        <p>
          {t(
            "При обращении через WhatsApp или иные внешние каналы связи применяются также правила и политика соответствующих сервисов. Гость использует такие каналы по собственному выбору.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={8} title={t("Изменение информации на сайте", locale)}>
        <p>
          {t(
            "Администрация вправе изменять содержание сайта, условия услуг и настоящие Условия использования.",
            locale,
          )}{" "}
          {t(LEGAL.lastUpdated, locale)}.
        </p>
      </LegalSection>

      <LegalSection index={9} title={t("Контакты", locale)}>
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
