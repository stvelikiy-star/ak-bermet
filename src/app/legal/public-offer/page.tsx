import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { getLocale } from "@/i18n/locale.server";
import type { Locale } from "@/i18n/locale";
import { t } from "@/i18n/dictionary";

type OfferCopy = {
  title: string;
  intro: string;
  sections: {
    general: { title: string; p1: string; p2: string };
    definitions: { title: string; items: string[] };
    subject: { title: string; text: string };
    request: { title: string; text: string; noticeTitle: string; rules: string[] };
    confirmation: { title: string; text: string };
    payment: { title: string; textBefore: string; textAfter: string; noticeTitle: string; notice: string };
    stay: { title: string; checkInLabel: string; checkOutLabel: string; items: string[] };
    food: { title: string; text: string };
    wellness: { title: string; text: string };
    cancellation: {
      title: string;
      intro: string;
      tiers: string[];
      refundText: string;
      disputes: string;
    };
    privacy: { title: string; text: string };
    liability: { title: string; text: string };
    forceMajeure: { title: string; text: string };
    changes: { title: string; text: string };
    contacts: { title: string; phoneLabel: string; addressLabel: string };
  };
};

const COPY: Record<Locale, OfferCopy> = {
  ru: {
    title: "Публичная оферта",
    intro:
      "Условия оказания услуг оздоровительного SPA & Wellness комплекса AK BERMET. Документ описывает порядок оформления заявки, подтверждения бронирования, оплаты и возврата.",
    sections: {
      general: {
        title: "Общие положения",
        p1:
          "Настоящая публичная оферта (далее — «Оферта») определяет условия оказания услуг проживания, питания, посещения горячих источников, SPA-комплекса и проведения мероприятий комплекса.",
        p2:
          "Оформление заявки на сайте, через форму, AI-ассистента, WhatsApp или иной канал связи означает, что гость ознакомился с условиями настоящей Оферты и принимает их.",
      },
      definitions: {
        title: "Термины и определения",
        items: [
          "«Комплекс» — оздоровительный SPA & Wellness комплекс AK BERMET.",
          "«Администрация» — уполномоченные сотрудники комплекса, оформляющие бронирование.",
          "«Гость» — физическое лицо, оформляющее заявку или проживающее в комплексе.",
          "«Заявка» — обращение гостя с пожеланиями по проживанию или услугам.",
          "«Бронирование» — подтверждённое администрацией размещение после предоплаты.",
        ],
      },
      subject: {
        title: "Предмет оферты",
        text:
          "Комплекс предоставляет услуги размещения, питания, доступа к горячим источникам и SPA-комплексу, а также площадки для мероприятий на условиях, указанных на сайте и согласованных с администрацией.",
      },
      request: {
        title: "Порядок оформления заявки",
        text:
          "Гость оставляет заявку с указанием дат заезда и выезда, количества гостей и пожеланий. Заявка обрабатывается администрацией.",
        noticeTitle: "Заявка не равна подтверждённой брони",
        rules: [
          "Заявка, отправленная через сайт, форму, AI-ассистента, WhatsApp или другой канал связи, не является автоматическим подтверждением бронирования.",
          "Бронирование подтверждается только после проверки наличия администратором и внесения предоплаты.",
          "Сайт, AI-ассистент и формы помогают собрать заявку, но не подтверждают наличие номера автоматически.",
          "Финальное подтверждение бронирования направляется администратором после проверки системы и поступления предоплаты.",
        ],
      },
      confirmation: {
        title: "Подтверждение бронирования",
        text:
          "Финальное подтверждение бронирования направляется администратором после проверки наличия в системе и поступления предоплаты. До этого момента номер не считается забронированным.",
      },
      payment: {
        title: "Предоплата и оплата",
        textBefore: "Размер предоплаты —",
        textAfter: "После поступления предоплаты администрация оформляет лист бронирования.",
        noticeTitle: "Платёжные реквизиты",
        notice:
          "Платёжные реквизиты предоставляются администратором после проверки наличия и согласования условий бронирования. Сайт и AI-ассистент реквизиты не отправляют.",
      },
      stay: {
        title: "Условия проживания",
        checkInLabel: "Время заезда",
        checkOutLabel: "Время выезда",
        items: [
          "Ранний заезд и поздний выезд возможны только по предварительному согласованию с администрацией и могут оплачиваться отдельно.",
          "Для групповых заездов условия раннего заезда и позднего выезда согласуются индивидуально.",
        ],
      },
      food: {
        title: "Питание и дополнительные услуги",
        text:
          "В стоимость проживания входит трёхразовое комплексное питание (завтрак, обед и ужин), если иное не указано в условиях конкретного тарифа. Дополнительные услуги оплачиваются отдельно и уточняются у администрации.",
      },
      wellness: {
        title: "SPA, бассейн и горячие источники",
        text:
          "Посещение SPA-комплекса, бассейна и горячих источников осуществляется в соответствии с расписанием и правилами комплекса. Минеральная вода источников используется в оздоровительных процедурах; комплекс не даёт медицинских гарантий. При наличии заболеваний рекомендуется проконсультироваться с врачом.",
      },
      cancellation: {
        title: "Отмена бронирования и возврат",
        intro: "Условия отмены и возврата предоплаты:",
        tiers: [
          "За 7 и более дней до заезда — возврат предоплаты возможен с учётом применимой комиссии и процедуры через администратора.",
          "Менее чем за 7 дней до заезда — предоплата не возвращается; отмена считается невозвратной.",
          "Неявка (no-show) — предоплата не возвращается; неявка считается невозвратной.",
        ],
        refundText:
          "Возврат средств производится способом, согласованным с администрацией, с учётом правил банка или платёжной системы. Подробнее — на странице «Возврат и отмена».",
        disputes:
          "В спорных или нестандартных случаях решение принимается администрацией комплекса в соответствии с условиями бронирования и действующим законодательством Кыргызской Республики.",
      },
      privacy: {
        title: "Персональные данные",
        text:
          "Персональные данные гостей обрабатываются для оформления заявки, связи и подтверждения бронирования. Подробнее — в Политике конфиденциальности.",
      },
      liability: {
        title: "Ответственность сторон",
        text:
          "Стороны несут ответственность в соответствии с условиями настоящей Оферты и действующим законодательством Кыргызской Республики. Комплекс не несёт ответственности за последствия предоставления гостем некорректных данных в заявке.",
      },
      forceMajeure: {
        title: "Форс-мажор",
        text:
          "Стороны освобождаются от ответственности за неисполнение обязательств, если оно вызвано обстоятельствами непреодолимой силы (форс-мажор), которые возникли после принятия условий Оферты.",
      },
      changes: {
        title: "Изменение условий оферты",
        text:
          "Комплекс вправе изменять условия настоящей Оферты. Актуальная редакция публикуется на сайте.",
      },
      contacts: {
        title: "Контактные данные",
        phoneLabel: "Телефон / WhatsApp",
        addressLabel: "Адрес",
      },
    },
  },
  kg: {
    title: "Коомдук оферта",
    intro:
      "AK BERMET SPA & Wellness ден соолукту чыңдоо комплексинин кызмат көрсөтүү шарттары. Документ өтүнмө берүү, бронду ырастоо, төлөө жана кайтаруу тартибин сүрөттөйт.",
    sections: {
      general: {
        title: "Жалпы жоболор",
        p1:
          "Ушул коомдук оферта (мындан ары — «Оферта») комплекстин жайгашуу, тамактануу, ысык булактарга жана SPA-комплекске баруу, ошондой эле иш-чараларды өткөрүү кызматтарынын шарттарын аныктайт.",
        p2:
          "Сайт, форма, AI-жардамчы, WhatsApp же башка байланыш каналы аркылуу өтүнмө берүү конок ушул Оферттин шарттары менен таанышканын жана аларды кабыл алганын билдирет.",
      },
      definitions: {
        title: "Терминдер жана аныктамалар",
        items: [
          "«Комплекс» — AK BERMET SPA & Wellness ден соолукту чыңдоо комплекси.",
          "«Администрация» — брондоону тариздеген комплекстин ыйгарым укуктуу кызматкерлери.",
          "«Конок» — өтүнмө берген же комплексте жашаган жеке жак.",
          "«Өтүнмө» — коноктун жайгашуу же кызматтар боюнча каалоолору камтылган кайрылуусу.",
          "«Брондоо» — алдын ала төлөмдөн кийин администрация тарабынан ырасталган жайгашуу.",
        ],
      },
      subject: {
        title: "Оферттин предмети",
        text:
          "Комплекс сайтта көрсөтүлгөн жана администрация менен макулдашылган шарттарда жайгашуу, тамактануу, ысык булактарга жана SPA-комплекске жетүү кызматтарын, ошондой эле иш-чаралар үчүн аянтчаларды сунуштайт.",
      },
      request: {
        title: "Өтүнмө берүү тартиби",
        text:
          "Конок кирүү жана чыгуу даталарын, коноктордун санын жана каалоолорун көрсөтүп өтүнмө берет. Өтүнмөнү администрация иштетет.",
        noticeTitle: "Өтүнмө ырасталган бронго барабар эмес",
        rules: [
          "Сайт, форма, AI-жардамчы, WhatsApp же башка байланыш каналы аркылуу жөнөтүлгөн өтүнмө брондун автоматтык ырасталышы болуп саналбайт.",
          "Брондоо администратор бош орунду текшерип, алдын ала төлөм түшкөндөн кийин гана ырасталат.",
          "Сайт, AI-жардамчы жана формалар өтүнмө чогултууга жардам берет, бирок номердин бош экенин автоматтык түрдө ырастабайт.",
          "Брондоонун акыркы ырастоосун система текшерилип, алдын ала төлөм түшкөндөн кийин администратор жөнөтөт.",
        ],
      },
      confirmation: {
        title: "Брондоону ырастоо",
        text:
          "Брондоонун акыркы ырастоосун система боюнча бош орун текшерилип, алдын ала төлөм түшкөндөн кийин администратор жөнөтөт. Ага чейин номер брондолгон болуп эсептелбейт.",
      },
      payment: {
        title: "Алдын ала төлөм жана төлөө",
        textBefore: "Алдын ала төлөмдүн өлчөмү —",
        textAfter: "Алдын ала төлөм түшкөндөн кийин администрация брондоо барагын тариздейт.",
        noticeTitle: "Төлөм реквизиттери",
        notice:
          "Төлөм реквизиттерин бош орун текшерилип, брондоо шарттары макулдашылгандан кийин администратор берет. Сайт жана AI-жардамчы реквизиттерди жөнөтпөйт.",
      },
      stay: {
        title: "Жашоо шарттары",
        checkInLabel: "Кирүү убактысы",
        checkOutLabel: "Чыгуу убактысы",
        items: [
          "Эрте кирүү жана кеч чыгуу администрация менен алдын ала макулдашылганда гана мүмкүн жана өзүнчө төлөнүшү мүмкүн.",
          "Топтук келүүлөр үчүн эрте кирүү жана кеч чыгуу шарттары өзүнчө макулдашылат.",
        ],
      },
      food: {
        title: "Тамактануу жана кошумча кызматтар",
        text:
          "Эгер конкреттүү тарифтин шарттарында башкача көрсөтүлбөсө, жашоо баасына күнүнө үч маал комплекстүү тамактануу (эртең мененки, түшкү жана кечки тамак) кирет. Кошумча кызматтар өзүнчө төлөнөт жана администрациядан такталат.",
      },
      wellness: {
        title: "SPA, бассейн жана ысык булактар",
        text:
          "SPA-комплекске, бассейнге жана ысык булактарга баруу комплекстин графигине жана эрежелерине ылайык жүргүзүлөт. Булактардын минералдык суусу ден соолукту чыңдоочу процедураларда колдонулат; комплекс медициналык кепилдик бербейт. Оорулар бар болсо, дарыгер менен кеңешүү сунушталат.",
      },
      cancellation: {
        title: "Бронду жокко чыгаруу жана кайтаруу",
        intro: "Алдын ала төлөмдү жокко чыгаруу жана кайтаруу шарттары:",
        tiers: [
          "Келүүгө 7 же андан көп күн калганда — алдын ала төлөм колдонулуучу комиссияны жана администратор аркылуу жүргүзүлүүчү тартипти эске алуу менен кайтарылышы мүмкүн.",
          "Келүүгө 7 күндөн аз калганда — алдын ала төлөм кайтарылбайт; жокко чыгаруу кайтарылгыс болуп эсептелет.",
          "Келбей калуу (no-show) — алдын ала төлөм кайтарылбайт; келбей калуу кайтарылгыс болуп эсептелет.",
        ],
        refundText:
          "Каражат администрация менен макулдашылган ыкмада, банктын же төлөм системасынын эрежелерин эске алуу менен кайтарылат. Толугураак маалымат «Бронду жокко чыгаруу жана акчаны кайтаруу» барагында.",
        disputes:
          "Талаштуу же стандарттуу эмес учурларда чечим брондоо шарттарына жана Кыргыз Республикасынын колдонуудагы мыйзамдарына ылайык комплекстин администрациясы тарабынан кабыл алынат.",
      },
      privacy: {
        title: "Жеке маалыматтар",
        text:
          "Коноктордун жеке маалыматтары өтүнмө тариздөө, байланышуу жана бронду ырастоо үчүн иштетилет. Толугураак маалымат Купуялык саясатында.",
      },
      liability: {
        title: "Тараптардын жоопкерчилиги",
        text:
          "Тараптар ушул Оферттин шарттарына жана Кыргыз Республикасынын колдонуудагы мыйзамдарына ылайык жоопкерчилик тартышат. Конок өтүнмөдө туура эмес маалымат берүүсүнүн кесепеттери үчүн комплекс жооп бербейт.",
      },
      forceMajeure: {
        title: "Форс-мажор",
        text:
          "Оферттин шарттары кабыл алынгандан кийин пайда болгон жеңилгис күч жагдайлары (форс-мажор) милдеттенмелердин аткарылбай калышына себеп болсо, тараптар жоопкерчиликтен бошотулат.",
      },
      changes: {
        title: "Оферттин шарттарын өзгөртүү",
        text:
          "Комплекс ушул Оферттин шарттарын өзгөртүүгө укуктуу. Актуалдуу редакция сайтта жарыяланат.",
      },
      contacts: {
        title: "Байланыш маалыматтары",
        phoneLabel: "Телефон / WhatsApp",
        addressLabel: "Дарек",
      },
    },
  },
  en: {
    title: "Public Offer",
    intro:
      "Terms for services provided by the AK BERMET SPA & Wellness resort. This document describes how requests, booking confirmation, payment and refunds are handled.",
    sections: {
      general: {
        title: "General provisions",
        p1:
          "This public offer (the “Offer”) sets out the terms for accommodation, dining, access to the hot springs and SPA complex, and events provided by the resort.",
        p2:
          "Submitting a request through the website, a form, the AI assistant, WhatsApp or another communication channel means that the guest has read and accepts the terms of this Offer.",
      },
      definitions: {
        title: "Terms and definitions",
        items: [
          "“Resort” means the AK BERMET SPA & Wellness resort.",
          "“Administration” means the authorized resort staff who process bookings.",
          "“Guest” means an individual who submits a request or stays at the resort.",
          "“Request” means a guest inquiry containing accommodation or service preferences.",
          "“Booking” means accommodation confirmed by the administration after the prepayment is received.",
        ],
      },
      subject: {
        title: "Subject of the Offer",
        text:
          "The resort provides accommodation, dining, access to the hot springs and SPA complex, and event venues under the terms stated on the website and agreed with the administration.",
      },
      request: {
        title: "How to submit a request",
        text:
          "The guest submits a request with check-in and check-out dates, number of guests and preferences. The administration processes the request.",
        noticeTitle: "A request is not a confirmed booking",
        rules: [
          "A request submitted through the website, a form, the AI assistant, WhatsApp or another communication channel is not an automatic booking confirmation.",
          "A booking is confirmed only after the administrator checks availability and the prepayment is received.",
          "The website, AI assistant and forms help collect a request but do not automatically confirm room availability.",
          "Final booking confirmation is sent by the administrator after the system is checked and the prepayment is received.",
        ],
      },
      confirmation: {
        title: "Booking confirmation",
        text:
          "Final booking confirmation is sent by the administrator after availability is checked in the system and the prepayment is received. Until then, the room is not considered booked.",
      },
      payment: {
        title: "Prepayment and payment",
        textBefore: "The prepayment amount is",
        textAfter: "After the prepayment is received, the administration issues the booking record.",
        noticeTitle: "Payment details",
        notice:
          "Payment details are provided by the administrator after availability has been checked and booking terms have been agreed. The website and AI assistant do not send payment details.",
      },
      stay: {
        title: "Stay conditions",
        checkInLabel: "Check-in time",
        checkOutLabel: "Check-out time",
        items: [
          "Early check-in and late check-out are possible only by prior agreement with the administration and may be charged separately.",
          "For group stays, early check-in and late check-out terms are agreed individually.",
        ],
      },
      food: {
        title: "Dining and additional services",
        text:
          "Three meals a day (breakfast, lunch and dinner) are included in the accommodation price unless otherwise stated in the specific rate terms. Additional services are charged separately and should be confirmed with the administration.",
      },
      wellness: {
        title: "SPA, pool and hot springs",
        text:
          "Access to the SPA complex, pool and hot springs follows the resort’s schedule and rules. Mineral spring water is used in wellness procedures; the resort does not provide medical guarantees. Guests with medical conditions are advised to consult a physician.",
      },
      cancellation: {
        title: "Booking cancellation and refunds",
        intro: "Cancellation and prepayment refund terms:",
        tiers: [
          "7 or more days before arrival — a prepayment refund may be possible subject to the applicable fee and the procedure handled through the administrator.",
          "Less than 7 days before arrival — the prepayment is non-refundable; the cancellation is treated as non-refundable.",
          "No-show — the prepayment is non-refundable; a no-show is treated as non-refundable.",
        ],
        refundText:
          "Refunds are made by a method agreed with the administration, subject to the rules of the bank or payment system. See the “Booking cancellation and refunds” page for details.",
        disputes:
          "In disputed or non-standard situations, the resort administration makes a decision in accordance with the booking terms and the applicable laws of the Kyrgyz Republic.",
      },
      privacy: {
        title: "Personal data",
        text:
          "Guests’ personal data is processed to handle requests, communicate with guests and confirm bookings. See the Privacy Policy for details.",
      },
      liability: {
        title: "Liability of the parties",
        text:
          "The parties are liable in accordance with this Offer and the applicable laws of the Kyrgyz Republic. The resort is not responsible for consequences arising from incorrect information provided by the guest in a request.",
      },
      forceMajeure: {
        title: "Force majeure",
        text:
          "The parties are released from liability for failure to perform obligations when caused by force-majeure circumstances arising after the terms of the Offer were accepted.",
      },
      changes: {
        title: "Changes to the Offer",
        text:
          "The resort may amend the terms of this Offer. The current version is published on the website.",
      },
      contacts: {
        title: "Contact details",
        phoneLabel: "Phone / WhatsApp",
        addressLabel: "Address",
      },
    },
  },
  kz: {
    title: "Жария оферта",
    intro:
      "AK BERMET SPA & Wellness сауықтыру кешенінің қызмет көрсету шарттары. Құжат өтінім беру, брондауды растау, төлем және қайтару тәртібін сипаттайды.",
    sections: {
      general: {
        title: "Жалпы ережелер",
        p1:
          "Осы жария оферта (бұдан әрі — «Оферта») кешеннің тұру, тамақтану, ыстық бұлақтарға және SPA-кешенге бару, сондай-ақ іс-шара өткізу қызметтерінің шарттарын белгілейді.",
        p2:
          "Сайт, форма, AI-көмекші, WhatsApp немесе басқа байланыс арнасы арқылы өтінім беру қонақтың осы Оферта шарттарымен танысқанын және оларды қабылдайтынын білдіреді.",
      },
      definitions: {
        title: "Терминдер мен анықтамалар",
        items: [
          "«Кешен» — AK BERMET SPA & Wellness сауықтыру кешені.",
          "«Әкімшілік» — брондауды рәсімдейтін кешеннің уәкілетті қызметкерлері.",
          "«Қонақ» — өтінім беретін немесе кешенде тұратын жеке тұлға.",
          "«Өтінім» — қонақтың тұру немесе қызметтер бойынша қалауларын қамтитын өтініші.",
          "«Брондау» — алдын ала төлемнен кейін әкімшілік растаған орналастыру.",
        ],
      },
      subject: {
        title: "Офертаның мәні",
        text:
          "Кешен сайтта көрсетілген және әкімшілікпен келісілген шарттарда тұру, тамақтану, ыстық бұлақтарға және SPA-кешенге қолжетімділік қызметтерін, сондай-ақ іс-шара алаңдарын ұсынады.",
      },
      request: {
        title: "Өтінім беру тәртібі",
        text:
          "Қонақ келу және шығу күндерін, қонақтар санын және қалауларын көрсетіп өтінім береді. Өтінімді әкімшілік өңдейді.",
        noticeTitle: "Өтінім расталған брондауға тең емес",
        rules: [
          "Сайт, форма, AI-көмекші, WhatsApp немесе басқа байланыс арнасы арқылы жіберілген өтінім брондаудың автоматты расталуы болып саналмайды.",
          "Брондау әкімші қолжетімділікті тексеріп, алдын ала төлем түскеннен кейін ғана расталады.",
          "Сайт, AI-көмекші және формалар өтінім жинауға көмектеседі, бірақ нөмір қолжетімділігін автоматты түрде растамайды.",
          "Брондаудың соңғы расталуын жүйе тексеріліп, алдын ала төлем түскеннен кейін әкімші жібереді.",
        ],
      },
      confirmation: {
        title: "Брондауды растау",
        text:
          "Брондаудың соңғы расталуын жүйеде қолжетімділік тексеріліп, алдын ала төлем түскеннен кейін әкімші жібереді. Осы сәтке дейін нөмір брондалған болып саналмайды.",
      },
      payment: {
        title: "Алдын ала төлем және төлем",
        textBefore: "Алдын ала төлем мөлшері —",
        textAfter: "Алдын ала төлем түскеннен кейін әкімшілік брондау парағын рәсімдейді.",
        noticeTitle: "Төлем деректемелері",
        notice:
          "Төлем деректемелерін қолжетімділік тексеріліп, брондау шарттары келісілгеннен кейін әкімші береді. Сайт пен AI-көмекші төлем деректемелерін жібермейді.",
      },
      stay: {
        title: "Тұру шарттары",
        checkInLabel: "Келу уақыты",
        checkOutLabel: "Шығу уақыты",
        items: [
          "Ерте келу және кеш шығу әкімшілікпен алдын ала келісілген жағдайда ғана мүмкін және бөлек төленуі мүмкін.",
          "Топтық келулер үшін ерте келу және кеш шығу шарттары жеке келісіледі.",
        ],
      },
      food: {
        title: "Тамақтану және қосымша қызметтер",
        text:
          "Егер нақты тариф шарттарында басқаша көрсетілмесе, тұру бағасына күніне үш рет кешенді тамақтану (таңғы ас, түскі ас және кешкі ас) кіреді. Қосымша қызметтер бөлек төленеді және әкімшіліктен нақтыланады.",
      },
      wellness: {
        title: "SPA, бассейн және ыстық бұлақтар",
        text:
          "SPA-кешенге, бассейнге және ыстық бұлақтарға бару кешеннің кестесі мен ережелеріне сәйкес жүзеге асырылады. Бұлақтардың минералды суы сауықтыру рәсімдерінде қолданылады; кешен медициналық кепілдік бермейді. Аурулар болған жағдайда дәрігермен кеңесу ұсынылады.",
      },
      cancellation: {
        title: "Брондауды жою және қайтару",
        intro: "Алдын ала төлемді жою және қайтару шарттары:",
        tiers: [
          "Келуге 7 немесе одан көп күн қалғанда — алдын ала төлем қолданылатын комиссияны және әкімші арқылы рәсімдеу тәртібін ескере отырып қайтарылуы мүмкін.",
          "Келуге 7 күннен аз қалғанда — алдын ала төлем қайтарылмайды; броньнан бас тарту қайтарылмайтын болып есептеледі.",
          "Қонақтың келмеуі (no-show) — алдын ала төлем қайтарылмайды; келмеу қайтарылмайтын жағдай болып есептеледі.",
        ],
        refundText:
          "Қаражат әкімшілікпен келісілген тәсілмен, банк немесе төлем жүйесінің ережелерін ескере отырып қайтарылады. Толығырақ «Брондауды жою және ақшаны қайтару» бетінде.",
        disputes:
          "Даулы немесе стандарттан тыс жағдайларда шешімді кешен әкімшілігі брондау шарттарына және Қырғыз Республикасының қолданыстағы заңнамасына сәйкес қабылдайды.",
      },
      privacy: {
        title: "Жеке деректер",
        text:
          "Қонақтардың жеке деректері өтінімді рәсімдеу, байланысу және брондауды растау үшін өңделеді. Толығырақ Құпиялылық саясатында.",
      },
      liability: {
        title: "Тараптардың жауапкершілігі",
        text:
          "Тараптар осы Оферта шарттарына және Қырғыз Республикасының қолданыстағы заңнамасына сәйкес жауап береді. Қонақ өтінімде дұрыс емес деректер беруінің салдары үшін кешен жауап бермейді.",
      },
      forceMajeure: {
        title: "Форс-мажор",
        text:
          "Оферта шарттары қабылданғаннан кейін туындаған еңсерілмейтін күш мән-жайлары (форс-мажор) міндеттемелердің орындалмауына себеп болса, тараптар жауапкершіліктен босатылады.",
      },
      changes: {
        title: "Оферта шарттарын өзгерту",
        text:
          "Кешен осы Оферта шарттарын өзгертуге құқылы. Өзекті редакция сайтта жарияланады.",
      },
      contacts: {
        title: "Байланыс деректері",
        phoneLabel: "Телефон / WhatsApp",
        addressLabel: "Мекенжай",
      },
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = COPY[locale];
  return {
    title: copy.title,
    description: copy.intro,
    alternates: { canonical: "/legal/public-offer" },
  };
}

export default async function PublicOfferPage() {
  const locale = await getLocale();
  const copy = COPY[locale];
  const s = copy.sections;

  return (
    <LegalPageLayout title={copy.title} intro={copy.intro} locale={locale}>
      <LegalSection index={1} title={s.general.title}>
        <p>
          {s.general.p1} {LEGAL.brand} ({LEGAL.entity}).
        </p>
        <p>{s.general.p2}</p>
      </LegalSection>

      <LegalSection index={2} title={s.definitions.title}>
        <LegalList items={s.definitions.items} />
      </LegalSection>

      <LegalSection index={3} title={s.subject.title}>
        <p>{s.subject.text}</p>
      </LegalSection>

      <LegalSection index={4} title={s.request.title}>
        <p>{s.request.text}</p>
        <LegalNotice title={s.request.noticeTitle}>
          <LegalList items={s.request.rules} />
        </LegalNotice>
      </LegalSection>

      <LegalSection index={5} title={s.confirmation.title}>
        <p>{s.confirmation.text}</p>
      </LegalSection>

      <LegalSection index={6} title={s.payment.title}>
        <p>
          {s.payment.textBefore} {LEGAL.prepayment}. {s.payment.textAfter}
        </p>
        <LegalNotice title={s.payment.noticeTitle}>
          <p>{s.payment.notice}</p>
        </LegalNotice>
      </LegalSection>

      <LegalSection index={7} title={s.stay.title}>
        <LegalList
          items={[
            `${s.stay.checkInLabel}: ${LEGAL.checkIn}.`,
            `${s.stay.checkOutLabel}: ${LEGAL.checkOut}.`,
            ...s.stay.items,
          ]}
        />
      </LegalSection>

      <LegalSection index={8} title={s.food.title}>
        <p>{s.food.text}</p>
      </LegalSection>

      <LegalSection index={9} title={s.wellness.title}>
        <p>{s.wellness.text}</p>
      </LegalSection>

      <LegalSection index={10} title={s.cancellation.title}>
        <p>{s.cancellation.intro}</p>
        <LegalList items={s.cancellation.tiers} />
        <p>{s.cancellation.refundText}</p>
        <p>{s.cancellation.disputes}</p>
      </LegalSection>

      <LegalSection index={11} title={s.privacy.title}>
        <p>{s.privacy.text}</p>
      </LegalSection>

      <LegalSection index={12} title={s.liability.title}>
        <p>{s.liability.text}</p>
      </LegalSection>

      <LegalSection index={13} title={s.forceMajeure.title}>
        <p>{s.forceMajeure.text}</p>
      </LegalSection>

      <LegalSection index={14} title={s.changes.title}>
        <p>
          {s.changes.text} {t(LEGAL.lastUpdated, locale)}.
        </p>
      </LegalSection>

      <LegalSection index={15} title={s.contacts.title}>
        <LegalList
          items={[
            `${LEGAL.brand} (${LEGAL.entity})`,
            `${s.contacts.phoneLabel}: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `${s.contacts.addressLabel}: ${t(LEGAL.address, locale)}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
