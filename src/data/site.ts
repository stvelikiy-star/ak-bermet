import type { Locale } from "@/i18n/locale";

// Центральная конфигурация сайта AK BERMET — SPA & WELLNESS.
// Все контакты и WhatsApp-ссылки берутся отсюда (не хардкодить по проекту).

export const SITE = {
  name: "AK BERMET",
  tagline: "SPA & WELLNESS",
  // Базовый домен (легко заменить при смене домена)
  url: "https://akbermet.kg",
  positioning:
    "Оздоровительный SPA & Wellness комплекс на Иссык-Куле с горячими источниками, проживанием, питанием и площадками для мероприятий.",
  footerText:
    "AK BERMET — SPA & WELLNESS, курортный комплекс на Иссык-Куле с горячими источниками, SPA, проживанием, питанием и площадками для мероприятий.",

  // Контакты
  phoneDisplay: "+996 501 772233",
  phoneRaw: "996501772233",
  springsPhoneDisplay: "+996 500 245 000",
  springsPhoneRaw: "996500245000",
  email: "akbermet@mail.ru",
  address:
    "Кыргызстан, Иссык-Кульская область, Иссык-Кульский район, с. Кара-Ой, ул. Асаке Тологонова 400/5",
  mapUrl: "https://2gis.kg/bishkek/geo/70000001027788812",

  directions:
    "При въезде в город Чолпон-Ата есть пост ГАИ. Перед постом ГАИ поверните направо в сторону озера. Ак-Бермет — третий пансионат.",
  distances: [
    "До Чолпон-Аты — около 3,9 км",
    "До аэропорта Тамчы — около 30 км",
  ],
} as const;

// Конструктор WhatsApp-ссылки на главный номер заявок.
export const wa = (text?: string) => {
  const base = `https://wa.me/${SITE.phoneRaw}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

type WaTopic =
  | "availability"
  | "booking"
  | "rooms"
  | "garden"
  | "springs"
  | "spa"
  | "events"
  | "food"
  | "promo"
  | "promo31";

const WA_TEXT: Record<WaTopic, Record<Locale, string>> = {
  availability: {
    ru: "Здравствуйте, хочу узнать наличие номеров в Ак-Бермет. Даты: ___, гостей: ___",
    kg: "Саламатсызбы, Ак-Берметтеги бош номерлерди тактагым келет. Даталар: ___, коноктор: ___",
    en: "Hello, I would like to check room availability at Ak-Bermet. Dates: ___, guests: ___",
    kz: "Сәлеметсіз бе, Ак-Берметтегі бос нөмірлерді білгім келеді. Күндер: ___, қонақтар: ___",
  },
  booking: {
    ru: "Здравствуйте, хочу узнать наличие номеров в Ак-Бермет. Даты: ___, гостей: ___",
    kg: "Саламатсызбы, Ак-Берметтеги бош номерлерди тактагым келет. Даталар: ___, коноктор: ___",
    en: "Hello, I would like to check room availability at Ak-Bermet. Dates: ___, guests: ___",
    kz: "Сәлеметсіз бе, Ак-Берметтегі бос нөмірлерді білгім келеді. Күндер: ___, қонақтар: ___",
  },
  rooms: {
    ru: "Здравствуйте, хочу узнать наличие номеров в Ак-Бермет. Даты: ___, гостей: ___",
    kg: "Саламатсызбы, Ак-Берметтеги бош номерлерди тактагым келет. Даталар: ___, коноктор: ___",
    en: "Hello, I would like to check room availability at Ak-Bermet. Dates: ___, guests: ___",
    kz: "Сәлеметсіз бе, Ак-Берметтегі бос нөмірлерді білгім келеді. Күндер: ___, қонақтар: ___",
  },
  garden: {
    ru: "Здравствуйте, хочу узнать наличие Garden Rooms в Ак-Бермет. Даты: ___, гостей: ___",
    kg: "Саламатсызбы, Ак-Берметтеги Garden Rooms бош орундарын тактагым келет. Даталар: ___, коноктор: ___",
    en: "Hello, I would like to check Garden Rooms availability at Ak-Bermet. Dates: ___, guests: ___",
    kz: "Сәлеметсіз бе, Ак-Берметтегі Garden Rooms қолжетімділігін білгім келеді. Күндер: ___, қонақтар: ___",
  },
  springs: {
    ru: "Здравствуйте, хочу уточнить информацию по горячим источникам Ак-Бермет.",
    kg: "Саламатсызбы, Ак-Берметтин ысык булактары боюнча маалымат тактагым келет.",
    en: "Hello, I would like more information about the Ak-Bermet hot springs.",
    kz: "Сәлеметсіз бе, Ак-Берметтің ыстық бұлақтары туралы ақпаратты нақтылағым келеді.",
  },
  spa: {
    ru: "Здравствуйте, хочу уточнить услуги SPA в Ак-Бермет.",
    kg: "Саламатсызбы, Ак-Берметтеги SPA кызматтарын тактагым келет.",
    en: "Hello, I would like more information about SPA services at Ak-Bermet.",
    kz: "Сәлеметсіз бе, Ак-Берметтегі SPA қызметтері туралы ақпаратты нақтылағым келеді.",
  },
  events: {
    ru: "Здравствуйте, хочу рассчитать мероприятие в Ак-Бермет. Количество гостей: ___, дата: ___",
    kg: "Саламатсызбы, Ак-Берметте иш-чара өткөрүүнүн шарттарын эсептегим келет. Коноктордун саны: ___, дата: ___",
    en: "Hello, I would like a quote for an event at Ak-Bermet. Guests: ___, date: ___",
    kz: "Сәлеметсіз бе, Ак-Берметтегі іс-шараның шарттарын есептегім келеді. Қонақтар саны: ___, күні: ___",
  },
  food: {
    ru: "Здравствуйте, хочу уточнить питание и меню в Ак-Бермет.",
    kg: "Саламатсызбы, Ак-Берметтеги тамактануу жана меню боюнча маалымат тактагым келет.",
    en: "Hello, I would like more information about dining and the menu at Ak-Bermet.",
    kz: "Сәлеметсіз бе, Ак-Берметтегі тамақтану және мәзір туралы ақпаратты нақтылағым келеді.",
  },
  promo: {
    ru: "Здравствуйте, хочу уточнить актуальные акции Ак-Бермет.",
    kg: "Саламатсызбы, Ак-Берметтин актуалдуу акцияларын тактагым келет.",
    en: "Hello, I would like to check the current Ak-Bermet promotions.",
    kz: "Сәлеметсіз бе, Ак-Берметтің өзекті акцияларын нақтылағым келеді.",
  },
  promo31: {
    ru: "Здравствуйте, хочу уточнить актуальные акции Ак-Бермет.",
    kg: "Саламатсызбы, Ак-Берметтин актуалдуу акцияларын тактагым келет.",
    en: "Hello, I would like to check the current Ak-Bermet promotions.",
    kz: "Сәлеметсіз бе, Ак-Берметтің өзекті акцияларын нақтылағым келеді.",
  },
};

export const waFor = (topic: WaTopic, locale: Locale) => wa(WA_TEXT[topic][locale]);

// Обратная совместимость для внутренних/служебных участков, где локаль пока
// не передаётся. Публичный интерфейс использует waFor(topic, locale).
export const WA = {
  availability: waFor("availability", "ru"),
  booking: waFor("booking", "ru"),
  rooms: waFor("rooms", "ru"),
  garden: waFor("garden", "ru"),
  springs: waFor("springs", "ru"),
  spa: waFor("spa", "ru"),
  events: waFor("events", "ru"),
  food: waFor("food", "ru"),
  promo: waFor("promo", "ru"),
  promo31: waFor("promo31", "ru"),
} as const;
