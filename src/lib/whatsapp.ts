import type { Lead } from "@/types/lead";
import { SITE } from "@/data/site";
import type { Locale } from "@/i18n/locale";

// Универсальный конструктор ссылки WhatsApp.
export function createWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

type WhatsAppCopy = {
  helloBooking: string;
  helloEvent: string;
  helloSpa: string;
  helloGeneral: string;
  name: string;
  phone: string;
  category: string;
  dates: string;
  adults: string;
  children: string;
  childrenAges: string;
  doubleBed: string;
  extraBed: string;
  wifi: string;
  lowerFloor: string;
  wishes: string;
  date: string;
  eventType: string;
  guests: string;
  hall: string;
  interest: string;
  visitDate: string;
  message: string;
  yes: string;
};

const WHATSAPP_COPY: Record<Locale, WhatsAppCopy> = {
  ru: {
    helloBooking: "Здравствуйте! Хочу узнать наличие в Ак-Бермет.",
    helloEvent: "Здравствуйте! Хотим провести мероприятие в Ак-Бермет.",
    helloSpa: "Здравствуйте! Интересует SPA / источники в Ак-Бермет.",
    helloGeneral: "Здравствуйте! У меня вопрос по Ак-Бермет.",
    name: "Имя", phone: "Телефон", category: "Категория", dates: "Даты",
    adults: "Взрослые", children: "Дети", childrenAges: "Возраст детей",
    doubleBed: "Двуспальная кровать", extraBed: "Доп. место", wifi: "Нужен Wi-Fi",
    lowerFloor: "Нижний этаж", wishes: "Пожелания", date: "Дата",
    eventType: "Тип мероприятия", guests: "Количество гостей", hall: "Зал",
    interest: "Интерес", visitDate: "Дата визита", message: "Сообщение", yes: "да",
  },
  kg: {
    helloBooking: "Саламатсызбы! Ак-Берметтеги бош номерлерди тактагым келет.",
    helloEvent: "Саламатсызбы! Ак-Берметте иш-чара өткөргүбүз келет.",
    helloSpa: "Саламатсызбы! Ак-Берметтеги SPA / булактар кызыктырат.",
    helloGeneral: "Саламатсызбы! Ак-Бермет боюнча суроом бар.",
    name: "Аты", phone: "Телефон", category: "Категория", dates: "Даталар",
    adults: "Чоңдор", children: "Балдар", childrenAges: "Балдардын жашы",
    doubleBed: "Эки кишилик керебет", extraBed: "Кошумча орун", wifi: "Wi-Fi керек",
    lowerFloor: "Төмөнкү кабат", wishes: "Каалоолор", date: "Дата",
    eventType: "Иш-чаранын түрү", guests: "Коноктордун саны", hall: "Зал",
    interest: "Кызыктырган кызмат", visitDate: "Баруу датасы", message: "Билдирүү", yes: "ооба",
  },
  en: {
    helloBooking: "Hello! I would like to check availability at Ak-Bermet.",
    helloEvent: "Hello! We would like to hold an event at Ak-Bermet.",
    helloSpa: "Hello! I am interested in the SPA / hot springs at Ak-Bermet.",
    helloGeneral: "Hello! I have a question about Ak-Bermet.",
    name: "Name", phone: "Phone", category: "Category", dates: "Dates",
    adults: "Adults", children: "Children", childrenAges: "Children's ages",
    doubleBed: "Double bed", extraBed: "Extra bed", wifi: "Wi-Fi required",
    lowerFloor: "Lower floor", wishes: "Preferences", date: "Date",
    eventType: "Event type", guests: "Number of guests", hall: "Hall",
    interest: "Service", visitDate: "Visit date", message: "Message", yes: "yes",
  },
  kz: {
    helloBooking: "Сәлеметсіз бе! Ак-Берметтегі бос нөмірлерді білгім келеді.",
    helloEvent: "Сәлеметсіз бе! Ак-Берметте іс-шара өткізгіміз келеді.",
    helloSpa: "Сәлеметсіз бе! Ак-Берметтегі SPA / бұлақтар қызықтырады.",
    helloGeneral: "Сәлеметсіз бе! Ак-Бермет бойынша сұрағым бар.",
    name: "Аты", phone: "Телефон", category: "Санат", dates: "Күндер",
    adults: "Ересектер", children: "Балалар", childrenAges: "Балалардың жасы",
    doubleBed: "Екі кісілік төсек", extraBed: "Қосымша орын", wifi: "Wi-Fi қажет",
    lowerFloor: "Төменгі қабат", wishes: "Қалаулар", date: "Күні",
    eventType: "Іс-шара түрі", guests: "Қонақтар саны", hall: "Зал",
    interest: "Қызықтыратын қызмет", visitDate: "Келу күні", message: "Хабарлама", yes: "иә",
  },
};

// Вспомогательное: собрать строки без пустых значений.
function lines(
  rows: Array<[string, string | number | undefined | null]>
): string {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && `${v}`.trim() !== "")
    .map(([label, v]) => `${label}: ${v}`)
    .join("\n");
}

export function createBookingWhatsAppText(
  lead: Partial<Lead>,
  locale: Locale = "ru"
): string {
  const copy = WHATSAPP_COPY[locale];
  const body = lines([
    [copy.name, lead.name],
    [copy.phone, lead.phone],
    [copy.category, lead.roomCategory],
    [
      copy.dates,
      lead.checkIn || lead.checkOut
        ? `${lead.checkIn ?? "?"} — ${lead.checkOut ?? "?"}`
        : undefined,
    ],
    [copy.adults, lead.adults],
    [copy.children, lead.children],
    [copy.childrenAges, lead.childrenAges],
    [copy.doubleBed, lead.wantsDoubleBed ? copy.yes : undefined],
    [copy.extraBed, lead.needsExtraBed ? copy.yes : undefined],
    [copy.wifi, lead.needsWifi ? copy.yes : undefined],
    [copy.lowerFloor, lead.needsLowerFloor ? copy.yes : undefined],
    [copy.wishes, lead.message],
  ]);
  return `${copy.helloBooking}\n\n${body}`;
}

export function createEventWhatsAppText(
  lead: Partial<Lead>,
  locale: Locale = "ru"
): string {
  const copy = WHATSAPP_COPY[locale];
  const body = lines([
    [copy.name, lead.name],
    [copy.phone, lead.phone],
    [copy.date, lead.checkIn],
    [copy.eventType, lead.eventType],
    [copy.guests, lead.guestsCount],
    [copy.hall, lead.hallSize],
    [copy.wishes, lead.message],
  ]);
  return `${copy.helloEvent}\n\n${body}`;
}

export function createSpaWhatsAppText(
  lead: Partial<Lead>,
  locale: Locale = "ru"
): string {
  const copy = WHATSAPP_COPY[locale];
  const body = lines([
    [copy.name, lead.name],
    [copy.phone, lead.phone],
    [copy.interest, lead.spaService],
    [copy.visitDate, lead.checkIn],
    [copy.guests, lead.guestsCount],
    [copy.wishes, lead.message],
  ]);
  return `${copy.helloSpa}\n\n${body}`;
}

export function createGeneralWhatsAppText(
  lead: Partial<Lead>,
  locale: Locale = "ru"
): string {
  const copy = WHATSAPP_COPY[locale];
  const body = lines([
    [copy.name, lead.name],
    [copy.phone, lead.phone],
    [copy.message, lead.message],
  ]);
  return `${copy.helloGeneral}\n\n${body}`;
}

// Ссылка на главный номер с уже собранным текстом.
export function whatsAppToMain(text: string): string {
  return createWhatsAppUrl(SITE.phoneRaw, text);
}

// Текст для передачи диалога администратору из AI-чата.
// AI-чат пока сохраняет русский служебный handoff по умолчанию; пользовательские
// формы выше полностью следуют выбранной локали.
export function createChatHandoffText(question?: string): string {
  const q = (question ?? "").trim();
  return (
    "Здравствуйте! Я общался с AI-помощником на сайте Ак-Бермет и хочу уточнить вопрос.\n\n" +
    `Мой вопрос:\n${q || "—"}`
  );
}
