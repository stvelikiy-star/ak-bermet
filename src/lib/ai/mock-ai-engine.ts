import type { ChatResponse, ChatTopic } from "@/types/chat";
import { KB } from "./knowledge-base";
import { SAFE_WORDING } from "./chat-rules";
import { matchesAny, actions } from "./chat-utils";

type Rule = {
  topic: ChatTopic;
  keywords: string[];
  build: (message: string) => ChatResponse;
};

// Порядок важен: отмена и оплата проверяются раньше общего «бронирования».
const RULES: Rule[] = [
  {
    topic: "cancellation",
    keywords: ["отмена", "отменить", "вернуть", "возврат", "не приеду"],
    build: (message) => ({
      ok: true,
      topic: "cancellation",
      shouldHandoff: true,
      message:
        `Правила отмены: ${KB.cancellation[0]} ${KB.cancellation[1]} ${KB.cancellation[2]} ` +
        "Спорные и индивидуальные ситуации решает администратор.",
      suggestedActions: [actions.handoff(message)],
    }),
  },
  {
    topic: "payment",
    keywords: [
      "оплата",
      "оплатить",
      "оплаты",
      "карта",
      "qr",
      "реквизит",
      "предоплат",
    ],
    build: (message) => ({
      ok: true,
      topic: "payment",
      shouldHandoff: true,
      message:
        `${KB.payment.prepayment} ${SAFE_WORDING.payment} ` +
        "Я не отправляю реквизиты — это делает администратор после проверки наличия.",
      suggestedActions: [actions.handoff(message)],
    }),
  },
  {
    topic: "events",
    keywords: [
      "корпоратив",
      "мероприят",
      "конференц",
      "зал",
      "семинар",
      "тренинг",
      "форум",
      "группа",
    ],
    build: () => ({
      ok: true,
      topic: "events",
      message:
        `Конференц-залы: ${KB.events.halls.join("; ")}. ` +
        `${KB.events.coffeeBreak}. Также ${KB.events.package}.`,
      suggestedActions: [
        actions.page("Открыть мероприятия", "/events"),
        actions.leadForm("Заявка на мероприятие", "/events#event-form"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "hot_springs",
    keywords: ["источник", "горяч", "минеральн", "купани"],
    build: () => ({
      ok: true,
      topic: "hot_springs",
      message:
        `Горячие источники: ${KB.hotSprings.pools} бассейнов, вода ${KB.hotSprings.temp}, ` +
        `работа ${KB.hotSprings.hours}. Цена — с 6 лет и взрослые 400 сом / 60 минут, дети до 6 лет бесплатно. ` +
        `Проживающим утром включено, запись не требуется. ${SAFE_WORDING.springs}`,
      suggestedActions: [
        actions.page("Подробнее об источниках", "/hot-springs"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "spa",
    keywords: [
      "spa",
      "спа",
      "массаж",
      "wellness",
      "велнес",
      "бассейн",
      "тренажер",
      "тренаж",
    ],
    build: () => ({
      ok: true,
      topic: "spa",
      message:
        `SPA & Wellness: ${KB.poolGym.poolSprings}; ${KB.poolGym.gymPoolSingle}. ` +
        `${KB.poolGym.capRequired}.`,
      suggestedActions: [
        actions.page("Открыть SPA", "/spa"),
        actions.leadForm("Записаться в SPA", "/spa#spa-form"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "food",
    keywords: ["питани", "завтрак", "обед", "ужин", "меню", "ресторан", "кафе"],
    build: () => ({
      ok: true,
      topic: "food",
      message:
        `В проживание входит ${KB.food.included}: ${KB.food.schedule.join(", ")}. ` +
        `Также ${KB.food.venues}.`,
      suggestedActions: [
        actions.page("Питание и рестораны", "/food"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "promos",
    keywords: ["акци", "скидк", "предложени", "3+1"],
    build: () => ({
      ok: true,
      topic: "promos",
      message: `${SAFE_WORDING.promos} Например: ${KB.promos.example}.`,
      suggestedActions: [
        actions.page("Смотреть акции", "/promos"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "legal",
    keywords: [
      "оферта",
      "оферте",
      "договор",
      "конфиденциальн",
      "персональн",
      "юридическ",
      "документ",
      "политика обработ",
    ],
    build: () => ({
      ok: true,
      topic: "legal",
      message:
        "Условия бронирования, оплаты и возврата описаны в разделах «Публичная оферта» " +
        "и «Возврат и отмена». Финальное подтверждение бронирования делает администратор " +
        "после проверки наличия и предоплаты.",
      suggestedActions: [
        actions.page("Публичная оферта", "/legal/public-offer"),
        actions.page("Возврат и отмена", "/legal/refund"),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "contacts",
    keywords: ["адрес", "где", "добрат", "2гис", "2gis", "телефон", "ватсап", "контакт"],
    build: () => ({
      ok: true,
      topic: "contacts",
      message:
        `Адрес: ${KB.contacts.address}. Ориентир: ${KB.brand.directions} ` +
        `WhatsApp: ${KB.contacts.whatsapp}.`,
      suggestedActions: [
        actions.link("Открыть 2ГИС", KB.contacts.map),
        actions.whatsapp(),
      ],
    }),
  },
  {
    topic: "rooms",
    keywords: [
      "номер",
      "коттедж",
      "сруб",
      "люкс",
      "полулюкс",
      "garden",
      "гарден",
      "брон",
      "забронир",
      "наличи",
      "свободно",
      "заезд",
      "выезд",
      "семейн",
      "разместить",
    ],
    build: () => ({
      ok: true,
      topic: "rooms",
      message:
        "Подскажите даты заезда и выезда, число взрослых и детей (и возраст детей) — поможем подобрать вариант. " +
        `${SAFE_WORDING.booking} Можно оставить заявку или написать в WhatsApp.`,
      suggestedActions: [
        actions.leadForm("Оставить заявку", "/rooms#booking-form"),
        actions.whatsapp("Написать в WhatsApp"),
      ],
    }),
  },
];

function defaultResponse(): ChatResponse {
  return {
    ok: true,
    topic: "general",
    message:
      "Здравствуйте! Помогу с номерами, источниками, SPA, мероприятиями и питанием. С чего начнём?",
    suggestedActions: [
      actions.page("Номера", "/rooms"),
      actions.page("Источники", "/hot-springs"),
      actions.page("SPA", "/spa"),
      actions.page("Мероприятия", "/events"),
      actions.whatsapp(),
    ],
  };
}

// Определяет тему по ключевым словам и возвращает безопасный ответ.
export function generateMockAIResponse(input: {
  message: string;
  page?: string;
}): ChatResponse {
  const message = (input.message ?? "").trim();
  if (!message) {
    return {
      ok: false,
      message: "Напишите, пожалуйста, ваш вопрос.",
    };
  }

  for (const rule of RULES) {
    if (matchesAny(message, rule.keywords)) {
      return rule.build(message);
    }
  }
  return defaultResponse();
}
