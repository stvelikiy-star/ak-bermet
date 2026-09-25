import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { getLocale } from "@/i18n/locale.server";
import type { Locale } from "@/i18n/locale";
import { t } from "@/i18n/dictionary";

type TermsCopy = {
  title: string;
  intro: string;
  purposeTitle: string;
  purpose: string;
  infoTitle: string;
  infoNotice: string;
  infoText: string;
  formsTitle: string;
  formsText: string;
  bookingRules: string[];
  aiTitle: string;
  aiNoticeTitle: string;
  aiNotice: string;
  aiText: string;
  liabilityTitle: string;
  liability: string;
  externalTitle: string;
  external: string;
  whatsappTitle: string;
  whatsapp: string;
  changesTitle: string;
  changes: string;
  contactsTitle: string;
  phoneLabel: string;
  addressLabel: string;
};

const COPY: Record<Locale, TermsCopy> = {
  ru: {
    title: "Условия использования сайта",
    intro: "Правила использования сайта AK BERMET, статус информации, заявок и AI-ассистента.",
    purposeTitle: "Назначение сайта",
    purpose:
      "Сайт AK BERMET — SPA & WELLNESS предназначен для информирования гостей об услугах комплекса и сбора заявок на проживание, посещение источников, SPA и проведение мероприятий.",
    infoTitle: "Информация на сайте",
    infoNotice:
      "Информация на сайте носит справочный характер и может быть изменена администрацией.",
    infoText:
      "Цены, наличие, расписание и условия услуг могут обновляться. Финальные условия подтверждает администратор.",
    formsTitle: "Заявки и формы",
    formsText:
      "Формы на сайте помогают собрать заявку с пожеланиями гостя. Отправка заявки не является подтверждением бронирования.",
    bookingRules: [
      "Заявка, отправленная через сайт, форму, AI-ассистента, WhatsApp или другой канал связи, не является автоматическим подтверждением бронирования.",
      "Бронирование подтверждается только после проверки наличия администратором и внесения предоплаты.",
      "Сайт, AI-ассистент и формы помогают собрать заявку, но не подтверждают наличие номера автоматически.",
      "Финальное подтверждение бронирования направляется администратором после проверки системы и поступления предоплаты.",
    ],
    aiTitle: "AI-ассистент",
    aiNoticeTitle: "Статус AI-ассистента",
    aiNotice:
      "AI-ассистент используется для первичной консультации и сбора заявки, но не является официальным подтверждением бронирования, наличия мест, стоимости или оплаты.",
    aiText:
      "Финальные условия проживания, стоимости, наличия и оплаты подтверждаются администратором.",
    liabilityTitle: "Ограничение ответственности",
    liability:
      "Комплекс не несёт ответственности за решения, принятые гостем исключительно на основании справочной информации сайта или ответов AI-ассистента без подтверждения администратора.",
    externalTitle: "Ссылки на сторонние сервисы",
    external:
      "Сайт может содержать ссылки на сторонние сервисы, например карты 2ГИС и WhatsApp. Комплекс не отвечает за содержание и политику сторонних ресурсов.",
    whatsappTitle: "WhatsApp и внешние каналы связи",
    whatsapp:
      "При обращении через WhatsApp или иные внешние каналы связи применяются также правила и политика соответствующих сервисов. Гость использует такие каналы по собственному выбору.",
    changesTitle: "Изменение информации на сайте",
    changes:
      "Администрация вправе изменять содержание сайта, условия услуг и настоящие Условия использования.",
    contactsTitle: "Контакты",
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Адрес",
  },
  kg: {
    title: "Сайтты колдонуу шарттары",
    intro: "AK BERMET сайтын колдонуу эрежелери, маалыматтын, өтүнмөлөрдүн жана AI-жардамчынын статусу.",
    purposeTitle: "Сайттын максаты",
    purpose:
      "AK BERMET — SPA & WELLNESS сайты конокторго комплекстин кызматтары жөнүндө маалымат берүү жана жайгашуу, булактарга баруу, SPA жана иш-чаралар боюнча өтүнмөлөрдү чогултуу үчүн арналган.",
    infoTitle: "Сайттагы маалымат",
    infoNotice:
      "Сайттагы маалымат маалымдама мүнөзүндө жана администрация тарабынан өзгөртүлүшү мүмкүн.",
    infoText:
      "Баалар, бош орундар, график жана кызмат шарттары жаңыртылышы мүмкүн. Акыркы шарттарды администратор ырастайт.",
    formsTitle: "Өтүнмөлөр жана формалар",
    formsText:
      "Сайттагы формалар коноктун каалоолору менен өтүнмө чогултууга жардам берет. Өтүнмөнү жөнөтүү брондун ырасталышы болуп саналбайт.",
    bookingRules: [
      "Сайт, форма, AI-жардамчы, WhatsApp же башка байланыш каналы аркылуу жөнөтүлгөн өтүнмө брондун автоматтык ырасталышы болуп саналбайт.",
      "Брондоо администратор бош орунду текшерип, алдын ала төлөм түшкөндөн кийин гана ырасталат.",
      "Сайт, AI-жардамчы жана формалар өтүнмө чогултууга жардам берет, бирок номердин бош экенин автоматтык түрдө ырастабайт.",
      "Брондоонун акыркы ырастоосун система текшерилип, алдын ала төлөм түшкөндөн кийин администратор жөнөтөт.",
    ],
    aiTitle: "AI-жардамчы",
    aiNoticeTitle: "AI-жардамчынын статусу",
    aiNotice:
      "AI-жардамчы алгачкы консультация жана өтүнмө чогултуу үчүн колдонулат, бирок брондун, бош орундардын, баанын же төлөмдүн расмий ырастоосу болуп саналбайт.",
    aiText:
      "Жайгашуунун, баанын, бош орундун жана төлөмдүн акыркы шарттарын администратор ырастайт.",
    liabilityTitle: "Жоопкерчиликти чектөө",
    liability:
      "Администратордун ырастоосу жок сайттагы маалымдама маалыматка же AI-жардамчынын жоопторуна гана таянып конок кабыл алган чечимдер үчүн комплекс жооп бербейт.",
    externalTitle: "Үчүнчү тараптын сервистерине шилтемелер",
    external:
      "Сайтта 2ГИС карталары жана WhatsApp сыяктуу үчүнчү тараптын сервистерине шилтемелер болушу мүмкүн. Комплекс мындай ресурстардын мазмуну жана саясаты үчүн жооп бербейт.",
    whatsappTitle: "WhatsApp жана тышкы байланыш каналдары",
    whatsapp:
      "WhatsApp же башка тышкы каналдар аркылуу кайрылууда тиешелүү сервистердин эрежелери жана саясаты да колдонулат. Конок мындай каналдарды өз тандоосу боюнча колдонот.",
    changesTitle: "Сайттагы маалыматты өзгөртүү",
    changes:
      "Администрация сайттын мазмунун, кызмат шарттарын жана ушул Колдонуу шарттарын өзгөртүүгө укуктуу.",
    contactsTitle: "Байланыштар",
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Дарек",
  },
  en: {
    title: "Website Terms of Use",
    intro: "Rules for using the AK BERMET website and the status of website information, requests and the AI assistant.",
    purposeTitle: "Purpose of the website",
    purpose:
      "The AK BERMET — SPA & WELLNESS website is intended to inform guests about the resort’s services and to collect requests for accommodation, hot springs, SPA and events.",
    infoTitle: "Information on the website",
    infoNotice:
      "Information on the website is provided for reference and may be changed by the administration.",
    infoText:
      "Prices, availability, schedules and service terms may be updated. Final terms are confirmed by the administrator.",
    formsTitle: "Requests and forms",
    formsText:
      "Website forms help collect a guest’s request and preferences. Submitting a request does not confirm a booking.",
    bookingRules: [
      "A request submitted through the website, a form, the AI assistant, WhatsApp or another communication channel is not an automatic booking confirmation.",
      "A booking is confirmed only after the administrator checks availability and the prepayment is received.",
      "The website, AI assistant and forms help collect a request but do not automatically confirm room availability.",
      "Final booking confirmation is sent by the administrator after the system is checked and the prepayment is received.",
    ],
    aiTitle: "AI assistant",
    aiNoticeTitle: "Status of the AI assistant",
    aiNotice:
      "The AI assistant is used for initial guidance and collecting requests, but it is not an official confirmation of a booking, availability, price or payment.",
    aiText:
      "Final accommodation terms, prices, availability and payment are confirmed by the administrator.",
    liabilityTitle: "Limitation of liability",
    liability:
      "The resort is not responsible for decisions made by a guest solely on the basis of reference information on the website or AI-assistant responses without administrator confirmation.",
    externalTitle: "Links to third-party services",
    external:
      "The website may contain links to third-party services such as 2GIS maps and WhatsApp. The resort is not responsible for the content or policies of third-party resources.",
    whatsappTitle: "WhatsApp and external communication channels",
    whatsapp:
      "When using WhatsApp or other external communication channels, the rules and policies of those services also apply. Guests use such channels by their own choice.",
    changesTitle: "Changes to website information",
    changes:
      "The administration may change the website content, service terms and these Terms of Use.",
    contactsTitle: "Contacts",
    phoneLabel: "Phone / WhatsApp",
    addressLabel: "Address",
  },
  kz: {
    title: "Сайтты пайдалану шарттары",
    intro: "AK BERMET сайтын пайдалану ережелері, ақпараттың, өтінімдердің және AI-көмекшінің мәртебесі.",
    purposeTitle: "Сайттың мақсаты",
    purpose:
      "AK BERMET — SPA & WELLNESS сайты қонақтарды кешен қызметтері туралы хабардар етуге және тұру, бұлақтарға бару, SPA және іс-шаралар бойынша өтінімдер жинауға арналған.",
    infoTitle: "Сайттағы ақпарат",
    infoNotice:
      "Сайттағы ақпарат анықтамалық сипатта беріледі және әкімшілік тарапынан өзгертілуі мүмкін.",
    infoText:
      "Бағалар, қолжетімділік, кесте және қызмет шарттары жаңартылуы мүмкін. Соңғы шарттарды әкімші растайды.",
    formsTitle: "Өтінімдер мен формалар",
    formsText:
      "Сайттағы формалар қонақтың өтінімі мен қалауларын жинауға көмектеседі. Өтінім жіберу брондауды растау болып саналмайды.",
    bookingRules: [
      "Сайт, форма, AI-көмекші, WhatsApp немесе басқа байланыс арнасы арқылы жіберілген өтінім брондаудың автоматты расталуы болып саналмайды.",
      "Брондау әкімші қолжетімділікті тексеріп, алдын ала төлем түскеннен кейін ғана расталады.",
      "Сайт, AI-көмекші және формалар өтінім жинауға көмектеседі, бірақ нөмір қолжетімділігін автоматты түрде растамайды.",
      "Брондаудың соңғы расталуын жүйе тексеріліп, алдын ала төлем түскеннен кейін әкімші жібереді.",
    ],
    aiTitle: "AI-көмекші",
    aiNoticeTitle: "AI-көмекшінің мәртебесі",
    aiNotice:
      "AI-көмекші бастапқы кеңес беру және өтінім жинау үшін пайдаланылады, бірақ брондаудың, бос орынның, бағаның немесе төлемнің ресми расталуы болып саналмайды.",
    aiText:
      "Тұрудың, бағаның, қолжетімділіктің және төлемнің соңғы шарттарын әкімші растайды.",
    liabilityTitle: "Жауапкершілікті шектеу",
    liability:
      "Әкімшінің растауынсыз сайттағы анықтамалық ақпаратқа немесе AI-көмекші жауаптарына ғана сүйеніп қонақ қабылдаған шешімдер үшін кешен жауап бермейді.",
    externalTitle: "Үшінші тарап сервистеріне сілтемелер",
    external:
      "Сайтта 2ГИС карталары мен WhatsApp сияқты үшінші тарап сервистеріне сілтемелер болуы мүмкін. Кешен үшінші тарап ресурстарының мазмұны мен саясатына жауап бермейді.",
    whatsappTitle: "WhatsApp және сыртқы байланыс арналары",
    whatsapp:
      "WhatsApp немесе басқа сыртқы байланыс арналары арқылы хабарласқанда тиісті сервистердің ережелері мен саясаты да қолданылады. Қонақ мұндай арналарды өз таңдауы бойынша пайдаланады.",
    changesTitle: "Сайттағы ақпаратты өзгерту",
    changes:
      "Әкімшілік сайт мазмұнын, қызмет шарттарын және осы Пайдалану шарттарын өзгертуге құқылы.",
    contactsTitle: "Байланыстар",
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
    alternates: { canonical: "/legal/terms" },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const copy = COPY[locale];

  return (
    <LegalPageLayout title={copy.title} intro={copy.intro} locale={locale}>
      <LegalSection index={1} title={copy.purposeTitle}>
        <p>{copy.purpose}</p>
      </LegalSection>

      <LegalSection index={2} title={copy.infoTitle}>
        <LegalNotice>
          <p>{copy.infoNotice}</p>
        </LegalNotice>
        <p>{copy.infoText}</p>
      </LegalSection>

      <LegalSection index={3} title={copy.formsTitle}>
        <p>{copy.formsText}</p>
        <LegalList items={copy.bookingRules} />
      </LegalSection>

      <LegalSection index={4} title={copy.aiTitle}>
        <LegalNotice title={copy.aiNoticeTitle}>
          <p>{copy.aiNotice}</p>
        </LegalNotice>
        <p>{copy.aiText}</p>
      </LegalSection>

      <LegalSection index={5} title={copy.liabilityTitle}>
        <p>{copy.liability}</p>
      </LegalSection>

      <LegalSection index={6} title={copy.externalTitle}>
        <p>{copy.external}</p>
      </LegalSection>

      <LegalSection index={7} title={copy.whatsappTitle}>
        <p>{copy.whatsapp}</p>
      </LegalSection>

      <LegalSection index={8} title={copy.changesTitle}>
        <p>
          {copy.changes} {t(LEGAL.lastUpdated, locale)}.
        </p>
      </LegalSection>

      <LegalSection index={9} title={copy.contactsTitle}>
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
