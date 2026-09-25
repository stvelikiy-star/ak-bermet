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
    title: t("Публичная оферта", locale),
    description: t(
      "Публичная оферта AK BERMET — SPA & WELLNESS: порядок оформления заявки, подтверждение бронирования, предоплата, проживание, отмена и возврат.",
      locale,
    ),
    alternates: { canonical: "/legal/public-offer" },
  };
}

export default async function PublicOfferPage() {
  const locale = await getLocale();

  return (
    <LegalPageLayout
      locale={locale}
      title={t("Публичная оферта", locale)}
      intro={t(
        "Условия оказания услуг оздоровительного SPA & Wellness комплекса AK BERMET. Документ описывает порядок оформления заявки, подтверждения бронирования, оплаты и возврата.",
        locale,
      )}
    >
      <LegalSection index={1} title={t("Общие положения", locale)}>
        <p>
          {t(
            "Настоящая публичная оферта (далее — «Оферта») определяет условия оказания услуг проживания, питания, посещения горячих источников, SPA-комплекса и проведения мероприятий комплекса",
            locale,
          )}{" "}
          {LEGAL.brand} ({t(LEGAL.entity, locale)}).
        </p>
        <p>
          {t(
            "Оформление заявки на сайте, через форму, AI-ассистента, WhatsApp или иной канал связи означает, что гость ознакомился с условиями настоящей Оферты и принимает их.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={2} title={t("Термины и определения", locale)}>
        <LegalList
          items={[
            t("«Комплекс» — оздоровительный SPA & Wellness комплекс AK BERMET.", locale),
            t("«Администрация» — уполномоченные сотрудники комплекса, оформляющие бронирование.", locale),
            t("«Гость» — физическое лицо, оформляющее заявку или проживающее в комплексе.", locale),
            t("«Заявка» — обращение гостя с пожеланиями по проживанию или услугам.", locale),
            t("«Бронирование» — подтверждённое администрацией размещение после предоплаты.", locale),
          ]}
        />
      </LegalSection>

      <LegalSection index={3} title={t("Предмет оферты", locale)}>
        <p>
          {t(
            "Комплекс предоставляет услуги размещения, питания, доступа к горячим источникам и SPA-комплексу, а также площадки для мероприятий на условиях, указанных на сайте и согласованных с администрацией.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={4} title={t("Порядок оформления заявки", locale)}>
        <p>
          {t(
            "Гость оставляет заявку с указанием дат заезда и выезда, количества гостей и пожеланий. Заявка обрабатывается администрацией.",
            locale,
          )}
        </p>
        <LegalNotice title={t("Заявка не равна подтверждённой брони", locale)}>
          <LegalList items={BOOKING_RULES.map((rule) => t(rule, locale))} />
        </LegalNotice>
      </LegalSection>

      <LegalSection index={5} title={t("Подтверждение бронирования", locale)}>
        <p>
          {t(
            "Финальное подтверждение бронирования направляется администратором после проверки наличия в системе и поступления предоплаты. До этого момента номер не считается забронированным.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={6} title={t("Предоплата и оплата", locale)}>
        <p>
          {t("Размер предоплаты —", locale)} {t(LEGAL.prepayment, locale)}.{" "}
          {t("После поступления предоплаты администрация оформляет лист бронирования.", locale)}
        </p>
        <LegalNotice title={t("Платёжные реквизиты", locale)}>
          <p>
            {t(
              "Платёжные реквизиты предоставляются администратором после проверки наличия и согласования условий бронирования. Сайт и AI-ассистент реквизиты не отправляют.",
              locale,
            )}
          </p>
        </LegalNotice>
      </LegalSection>

      <LegalSection index={7} title={t("Условия проживания", locale)}>
        <LegalList
          items={[
            `${t("Время заезда", locale)}: ${t(LEGAL.checkIn, locale)}.`,
            `${t("Время выезда", locale)}: ${t(LEGAL.checkOut, locale)}.`,
            t(
              "Ранний заезд и поздний выезд возможны только по предварительному согласованию с администрацией и могут оплачиваться отдельно.",
              locale,
            ),
            t(
              "Для групповых заездов условия раннего заезда и позднего выезда согласуются индивидуально.",
              locale,
            ),
          ]}
        />
      </LegalSection>

      <LegalSection index={8} title={t("Питание и дополнительные услуги", locale)}>
        <p>
          {t(
            "В стоимость проживания входит трёхразовое комплексное питание (завтрак, обед и ужин), если иное не указано в условиях конкретного тарифа. Дополнительные услуги оплачиваются отдельно и уточняются у администрации.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={9} title={t("SPA, бассейн и горячие источники", locale)}>
        <p>
          {t(
            "Посещение SPA-комплекса, бассейна и горячих источников осуществляется в соответствии с расписанием и правилами комплекса. Минеральная вода источников используется в оздоровительных процедурах; комплекс не даёт медицинских гарантий. При наличии заболеваний рекомендуется проконсультироваться с врачом.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={10} title={t("Отмена бронирования и возврат", locale)}>
        <p>{t("Условия отмены и возврата предоплаты:", locale)}</p>
        <LegalList
          items={LEGAL.refundTiers.map(
            (tier) =>
              `${t(tier.term, locale)} — ${t(tier.result, locale)}. ${t(tier.note, locale)}.`,
          )}
        />
        <p>
          {t(
            "Возврат средств производится способом, согласованным с администрацией, с учётом правил банка или платёжной системы. Подробнее — на странице «Возврат и отмена».",
            locale,
          )}
        </p>
        <p>
          {t(
            "В спорных или нестандартных случаях решение принимается администрацией комплекса в соответствии с условиями бронирования и действующим законодательством Кыргызской Республики.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={11} title={t("Персональные данные", locale)}>
        <p>
          {t(
            "Персональные данные гостей обрабатываются для оформления заявки, связи и подтверждения бронирования. Подробнее — в Политике конфиденциальности.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={12} title={t("Ответственность сторон", locale)}>
        <p>
          {t(
            "Стороны несут ответственность в соответствии с условиями настоящей Оферты и действующим законодательством Кыргызской Республики. Комплекс не несёт ответственности за последствия предоставления гостем некорректных данных в заявке.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={13} title={t("Форс-мажор", locale)}>
        <p>
          {t(
            "Стороны освобождаются от ответственности за неисполнение обязательств, если оно вызвано обстоятельствами непреодолимой силы (форс-мажор), которые возникли после принятия условий Оферты.",
            locale,
          )}
        </p>
      </LegalSection>

      <LegalSection index={14} title={t("Изменение условий оферты", locale)}>
        <p>
          {t(
            "Комплекс вправе изменять условия настоящей Оферты. Актуальная редакция публикуется на сайте.",
            locale,
          )}{" "}
          {t(LEGAL.lastUpdated, locale)}.
        </p>
      </LegalSection>

      <LegalSection index={15} title={t("Контактные данные", locale)}>
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
