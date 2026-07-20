import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL, BOOKING_RULES } from "@/data/legal";

export const metadata: Metadata = {
  title: "Условия использования сайта",
  description:
    "Условия использования сайта AK BERMET: назначение сайта, заявки и формы, AI-ассистент, ограничение ответственности и внешние сервисы.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Условия использования сайта"
      intro="Правила использования сайта AK BERMET, статус информации, заявок и AI-ассистента."
    >
      <LegalSection index={1} title="Назначение сайта">
        <p>
          Сайт {LEGAL.brand} предназначен для информирования гостей об услугах
          комплекса и сбора заявок на проживание, посещение источников, SPA и
          проведение мероприятий.
        </p>
      </LegalSection>

      <LegalSection index={2} title="Информация на сайте">
        <LegalNotice>
          <p>
            Информация на сайте носит справочный характер и может быть изменена
            администрацией.
          </p>
        </LegalNotice>
        <p>
          Цены, наличие, расписание и условия услуг могут обновляться. Финальные
          условия подтверждает администратор.
        </p>
      </LegalSection>

      <LegalSection index={3} title="Заявки и формы">
        <p>
          Формы на сайте помогают собрать заявку с пожеланиями гостя. Отправка
          заявки не является подтверждением бронирования.
        </p>
        <LegalList items={BOOKING_RULES} />
      </LegalSection>

      <LegalSection index={4} title="AI-ассистент">
        <LegalNotice title="Статус AI-ассистента">
          <p>
            AI-ассистент используется для первичной консультации и сбора заявки,
            но не является официальным подтверждением бронирования, наличия мест,
            стоимости или оплаты.
          </p>
        </LegalNotice>
        <p>
          Финальные условия проживания, стоимости, наличия и оплаты подтверждаются
          администратором.
        </p>
      </LegalSection>

      <LegalSection index={5} title="Ограничение ответственности">
        <p>
          Комплекс не несёт ответственности за решения, принятые гостем
          исключительно на основании справочной информации сайта или ответов
          AI-ассистента без подтверждения администратора.
        </p>
      </LegalSection>

      <LegalSection index={6} title="Ссылки на сторонние сервисы">
        <p>
          Сайт может содержать ссылки на сторонние сервисы (например, карты 2ГИС,
          WhatsApp). Комплекс не отвечает за содержание и политику сторонних
          ресурсов.
        </p>
      </LegalSection>

      <LegalSection index={7} title="WhatsApp и внешние каналы связи">
        <p>
          При обращении через WhatsApp или иные внешние каналы связи применяются
          также правила и политика соответствующих сервисов. Гость использует
          такие каналы по собственному выбору.
        </p>
      </LegalSection>

      <LegalSection index={8} title="Изменение информации на сайте">
        <p>
          Администрация вправе изменять содержание сайта, условия услуг и
          настоящие Условия использования. {LEGAL.lastUpdated}.
        </p>
      </LegalSection>

      <LegalSection index={9} title="Контакты">
        <LegalList
          items={[
            `${LEGAL.brand} (${LEGAL.entity})`,
            `Телефон / WhatsApp: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `Адрес: ${LEGAL.address}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
