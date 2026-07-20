import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description:
    "Политика конфиденциальности AK BERMET: какие данные собираются, для чего используются, где хранятся и какие права есть у гостя.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Политика конфиденциальности"
      intro="Как комплекс AK BERMET собирает, использует и защищает персональные данные гостей при оформлении заявок и бронировании."
    >
      <LegalSection index={1} title="Какие данные собираются">
        <p>При оформлении заявки комплекс может собирать:</p>
        <LegalList
          items={[
            "имя гостя;",
            "номер телефона;",
            "email, если он указан;",
            "даты заезда и выезда;",
            "количество гостей;",
            "комментарии и пожелания к заявке;",
            "технические данные сайта (например, обезличенная статистика посещений).",
          ]}
        />
      </LegalSection>

      <LegalSection index={2} title="Для чего используются данные">
        <LegalList
          items={[
            "обработка заявки;",
            "связь с гостем;",
            "подтверждение бронирования;",
            "улучшение сервиса;",
            "выполнение требований законодательства.",
          ]}
        />
      </LegalSection>

      <LegalSection index={3} title="Где могут храниться данные">
        <LegalList
          items={[
            "на сайте комплекса;",
            "в CRM / manager-разделе для обработки заявок;",
            "в Google Sheets, если такая интеграция подключена;",
            "в мессенджерах, если гость самостоятельно пишет в WhatsApp.",
          ]}
        />
      </LegalSection>

      <LegalSection index={4} title="Кто имеет доступ к данным">
        <LegalList
          items={[
            "администрация комплекса;",
            "уполномоченные сотрудники;",
            "технические специалисты — только при необходимости обслуживания.",
          ]}
        />
      </LegalSection>

      <LegalSection index={5} title="Срок хранения">
        <p>
          Данные хранятся в течение срока, необходимого для обработки заявки,
          оказания услуг и выполнения требований законодательства, после чего
          могут быть удалены или обезличены.
        </p>
      </LegalSection>

      <LegalSection index={6} title="Меры защиты">
        <LegalNotice title="О защите данных">
          <p>
            Мы принимаем разумные организационные и технические меры для защиты
            персональных данных. При этом ни один способ передачи или хранения
            данных не может гарантировать абсолютную безопасность.
          </p>
        </LegalNotice>
      </LegalSection>

      <LegalSection index={7} title="Права пользователя">
        <p>Гость вправе:</p>
        <LegalList
          items={[
            "запросить информацию об обработке своих данных;",
            "запросить уточнение или исправление данных;",
            "запросить удаление данных, если это не противоречит требованиям закона.",
          ]}
        />
      </LegalSection>

      <LegalSection index={8} title="Контакты для обращения">
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
