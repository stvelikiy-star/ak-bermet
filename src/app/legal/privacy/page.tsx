import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { getLocale } from "@/i18n/locale.server";
import type { Locale } from "@/i18n/locale";
import { t } from "@/i18n/dictionary";

const COPY: Record<
  Locale,
  {
    title: string;
    intro: string;
    sections: {
      collected: string;
      collectedIntro: string;
      collectedItems: string[];
      purpose: string;
      purposeItems: string[];
      storage: string;
      storageItems: string[];
      access: string;
      accessItems: string[];
      retention: string;
      retentionText: string;
      protection: string;
      protectionTitle: string;
      protectionText: string;
      rights: string;
      rightsIntro: string;
      rightsItems: string[];
      contacts: string;
    };
    phoneLabel: string;
    addressLabel: string;
  }
> = {
  ru: {
    title: "Политика конфиденциальности",
    intro:
      "Как комплекс AK BERMET собирает, использует и защищает персональные данные гостей при оформлении заявок и бронировании.",
    sections: {
      collected: "Какие данные собираются",
      collectedIntro: "При оформлении заявки комплекс может собирать:",
      collectedItems: [
        "имя гостя;",
        "номер телефона;",
        "email, если он указан;",
        "даты заезда и выезда;",
        "количество гостей;",
        "комментарии и пожелания к заявке;",
        "технические данные сайта (например, обезличенная статистика посещений).",
      ],
      purpose: "Для чего используются данные",
      purposeItems: [
        "обработка заявки;",
        "связь с гостем;",
        "подтверждение бронирования;",
        "улучшение сервиса;",
        "выполнение требований законодательства.",
      ],
      storage: "Где могут храниться данные",
      storageItems: [
        "на сайте комплекса;",
        "в CRM / manager-разделе для обработки заявок;",
        "в Google Sheets, если такая интеграция подключена;",
        "в мессенджерах, если гость самостоятельно пишет в WhatsApp.",
      ],
      access: "Кто имеет доступ к данным",
      accessItems: [
        "администрация комплекса;",
        "уполномоченные сотрудники;",
        "технические специалисты — только при необходимости обслуживания.",
      ],
      retention: "Срок хранения",
      retentionText:
        "Данные хранятся в течение срока, необходимого для обработки заявки, оказания услуг и выполнения требований законодательства, после чего могут быть удалены или обезличены.",
      protection: "Меры защиты",
      protectionTitle: "О защите данных",
      protectionText:
        "Мы принимаем разумные организационные и технические меры для защиты персональных данных. При этом ни один способ передачи или хранения данных не может гарантировать абсолютную безопасность.",
      rights: "Права пользователя",
      rightsIntro: "Гость вправе:",
      rightsItems: [
        "запросить информацию об обработке своих данных;",
        "запросить уточнение или исправление данных;",
        "запросить удаление данных, если это не противоречит требованиям закона.",
      ],
      contacts: "Контакты для обращения",
    },
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Адрес",
  },
  kg: {
    title: "Купуялык саясаты",
    intro:
      "AK BERMET комплекси өтүнмө жана брондоо учурунда коноктордун жеке маалыматтарын кантип чогултарын, колдоноорун жана коргоорун түшүндүрөт.",
    sections: {
      collected: "Кандай маалыматтар чогултулат",
      collectedIntro: "Өтүнмө берүүдө комплекс төмөнкү маалыматтарды чогулта алат:",
      collectedItems: [
        "коноктун аты-жөнү;",
        "телефон номери;",
        "эгер көрсөтүлсө, email;",
        "кирүү жана чыгуу даталары;",
        "коноктордун саны;",
        "өтүнмөгө комментарийлер жана каалоолор;",
        "сайттын техникалык маалыматтары (мисалы, жеке адамды аныктабаган кирүү статистикасы).",
      ],
      purpose: "Маалыматтар эмне үчүн колдонулат",
      purposeItems: [
        "өтүнмөнү иштетүү;",
        "конок менен байланышуу;",
        "брондоону ырастоо;",
        "кызматты жакшыртуу;",
        "мыйзам талаптарын аткаруу.",
      ],
      storage: "Маалыматтар кайда сакталышы мүмкүн",
      storageItems: [
        "комплекстин сайтында;",
        "өтүнмөлөрдү иштетүү үчүн CRM / manager-бөлүмүндө;",
        "эгер интеграция кошулган болсо, Google Sheets'те;",
        "конок WhatsApp аркылуу өзү жазса, мессенжерлерде.",
      ],
      access: "Маалыматтарга кимдер кире алат",
      accessItems: [
        "комплекстин администрациясы;",
        "ыйгарым укуктуу кызматкерлер;",
        "техникалык адистер — тейлөө зарыл болгон учурда гана.",
      ],
      retention: "Сактоо мөөнөтү",
      retentionText:
        "Маалыматтар өтүнмөнү иштетүү, кызмат көрсөтүү жана мыйзам талаптарын аткаруу үчүн зарыл болгон мөөнөттө сакталат, андан кийин өчүрүлүшү же анонимдештирилиши мүмкүн.",
      protection: "Коргоо чаралары",
      protectionTitle: "Маалыматтарды коргоо жөнүндө",
      protectionText:
        "Биз жеке маалыматтарды коргоо үчүн акылга сыярлык уюштуруучулук жана техникалык чараларды колдонобуз. Ошол эле учурда маалыматтарды берүү же сактоонун эч бир ыкмасы абсолюттук коопсуздукка кепилдик бере албайт.",
      rights: "Колдонуучунун укуктары",
      rightsIntro: "Конок төмөнкүлөргө укуктуу:",
      rightsItems: [
        "өзүнүн маалыматтарын иштетүү жөнүндө маалымат суроого;",
        "маалыматтарды тактоону же оңдоону суроого;",
        "эгер бул мыйзам талаптарына каршы келбесе, маалыматтарды өчүрүүнү суроого.",
      ],
      contacts: "Кайрылуу үчүн байланыштар",
    },
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Дарек",
  },
  en: {
    title: "Privacy Policy",
    intro:
      "How AK BERMET collects, uses and protects guests’ personal data when handling requests and bookings.",
    sections: {
      collected: "Data we collect",
      collectedIntro: "When a request is submitted, the resort may collect:",
      collectedItems: [
        "guest name;",
        "phone number;",
        "email, if provided;",
        "check-in and check-out dates;",
        "number of guests;",
        "comments and preferences included in the request;",
        "technical website data (for example, anonymized visit statistics).",
      ],
      purpose: "How the data is used",
      purposeItems: [
        "processing requests;",
        "communicating with the guest;",
        "confirming bookings;",
        "improving service;",
        "meeting legal requirements.",
      ],
      storage: "Where data may be stored",
      storageItems: [
        "on the resort website;",
        "in the CRM / manager area for processing requests;",
        "in Google Sheets if that integration is enabled;",
        "in messaging services if the guest contacts us through WhatsApp.",
      ],
      access: "Who may access the data",
      accessItems: [
        "resort administration;",
        "authorized employees;",
        "technical specialists, only when required for maintenance.",
      ],
      retention: "Retention period",
      retentionText:
        "Data is retained for as long as necessary to process the request, provide services and meet legal requirements, after which it may be deleted or anonymized.",
      protection: "Security measures",
      protectionTitle: "Data protection",
      protectionText:
        "We use reasonable organizational and technical measures to protect personal data. However, no method of transmission or storage can guarantee absolute security.",
      rights: "User rights",
      rightsIntro: "A guest may:",
      rightsItems: [
        "request information about the processing of their data;",
        "request clarification or correction of their data;",
        "request deletion of data where this does not conflict with legal requirements.",
      ],
      contacts: "Contact details",
    },
    phoneLabel: "Phone / WhatsApp",
    addressLabel: "Address",
  },
  kz: {
    title: "Құпиялылық саясаты",
    intro:
      "AK BERMET кешені өтінімдер мен брондауды рәсімдеу кезінде қонақтардың жеке деректерін қалай жинайтынын, пайдаланатынын және қорғайтынын түсіндіреді.",
    sections: {
      collected: "Қандай деректер жиналады",
      collectedIntro: "Өтінім рәсімделген кезде кешен мына деректерді жинауы мүмкін:",
      collectedItems: [
        "қонақтың аты-жөні;",
        "телефон нөмірі;",
        "көрсетілген жағдайда email;",
        "келу және шығу күндері;",
        "қонақтар саны;",
        "өтінімге берілген түсініктемелер мен қалаулар;",
        "сайттың техникалық деректері (мысалы, иесіздендірілген кіру статистикасы).",
      ],
      purpose: "Деректер не үшін пайдаланылады",
      purposeItems: [
        "өтінімді өңдеу;",
        "қонақпен байланысу;",
        "брондауды растау;",
        "қызметті жақсарту;",
        "заңнама талаптарын орындау.",
      ],
      storage: "Деректер қайда сақталуы мүмкін",
      storageItems: [
        "кешен сайтында;",
        "өтінімдерді өңдеу үшін CRM / manager бөлімінде;",
        "интеграция қосылған болса, Google Sheets жүйесінде;",
        "қонақ WhatsApp арқылы өзі хабарласса, мессенджерлерде.",
      ],
      access: "Деректерге кім қол жеткізе алады",
      accessItems: [
        "кешен әкімшілігі;",
        "уәкілетті қызметкерлер;",
        "техникалық мамандар — қызмет көрсету қажет болғанда ғана.",
      ],
      retention: "Сақтау мерзімі",
      retentionText:
        "Деректер өтінімді өңдеу, қызмет көрсету және заңнама талаптарын орындау үшін қажетті мерзім бойы сақталады, содан кейін жойылуы немесе иесіздендірілуі мүмкін.",
      protection: "Қорғау шаралары",
      protectionTitle: "Деректерді қорғау туралы",
      protectionText:
        "Біз жеке деректерді қорғау үшін ақылға қонымды ұйымдастырушылық және техникалық шараларды қолданамыз. Дегенмен деректерді беру немесе сақтаудың ешбір тәсілі абсолютті қауіпсіздікке кепілдік бере алмайды.",
      rights: "Пайдаланушы құқықтары",
      rightsIntro: "Қонақтың құқығы бар:",
      rightsItems: [
        "өз деректерінің өңделуі туралы ақпарат сұратуға;",
        "деректерді нақтылауды немесе түзетуді сұратуға;",
        "егер бұл заң талаптарына қайшы келмесе, деректерді жоюды сұратуға.",
      ],
      contacts: "Өтініш жасауға арналған байланыстар",
    },
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Мекенжай",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = COPY[locale];
  return {
    title: copy.title,
    description: copy.intro,
    alternates: { canonical: "/legal/privacy" },
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const copy = COPY[locale];

  return (
    <LegalPageLayout title={copy.title} intro={copy.intro} locale={locale}>
      <LegalSection index={1} title={copy.sections.collected}>
        <p>{copy.sections.collectedIntro}</p>
        <LegalList items={copy.sections.collectedItems} />
      </LegalSection>

      <LegalSection index={2} title={copy.sections.purpose}>
        <LegalList items={copy.sections.purposeItems} />
      </LegalSection>

      <LegalSection index={3} title={copy.sections.storage}>
        <LegalList items={copy.sections.storageItems} />
      </LegalSection>

      <LegalSection index={4} title={copy.sections.access}>
        <LegalList items={copy.sections.accessItems} />
      </LegalSection>

      <LegalSection index={5} title={copy.sections.retention}>
        <p>{copy.sections.retentionText}</p>
      </LegalSection>

      <LegalSection index={6} title={copy.sections.protection}>
        <LegalNotice title={copy.sections.protectionTitle}>
          <p>{copy.sections.protectionText}</p>
        </LegalNotice>
      </LegalSection>

      <LegalSection index={7} title={copy.sections.rights}>
        <p>{copy.sections.rightsIntro}</p>
        <LegalList items={copy.sections.rightsItems} />
      </LegalSection>

      <LegalSection index={8} title={copy.sections.contacts}>
        <LegalList
          items={[
            `${LEGAL.brand} (${LEGAL.entity})`,
            `${copy.phoneLabel}: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `${copy.addressLabel}: ${t(LEGAL.address, locale)}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
