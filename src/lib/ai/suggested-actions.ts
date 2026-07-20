import type { ChatSuggestedAction, ChatTopic } from "@/types/chat";
import { actions } from "./chat-utils";

// Возвращает suggested actions по теме ответа.
export function actionsForTopic(topic?: ChatTopic): ChatSuggestedAction[] {
  switch (topic) {
    case "rooms":
    case "booking":
      return [
        actions.leadForm("Оставить заявку", "/rooms#booking-form"),
        actions.whatsapp("WhatsApp администратору"),
      ];
    case "garden":
      return [
        actions.leadForm("Узнать Garden Rooms", "/garden#booking-form"),
        actions.whatsapp(),
      ];
    case "hot_springs":
      return [
        actions.page("Цены источников", "/hot-springs"),
        actions.whatsapp(),
      ];
    case "spa":
      return [
        actions.leadForm("Записаться в SPA", "/spa#spa-form"),
        actions.whatsapp(),
      ];
    case "events":
      return [
        actions.leadForm("Заявка на мероприятие", "/events#event-form"),
        actions.whatsapp(),
      ];
    case "food":
      return [actions.page("Питание и рестораны", "/food"), actions.whatsapp()];
    case "promos":
      return [actions.page("Смотреть акции", "/promos"), actions.whatsapp()];
    case "contacts":
      return [actions.page("Открыть контакты", "/contacts"), actions.whatsapp()];
    case "payment":
    case "cancellation":
      return [actions.handoff()];
    case "legal":
      return [
        actions.page("Публичная оферта", "/legal/public-offer"),
        actions.page("Возврат и отмена", "/legal/refund"),
        actions.whatsapp(),
      ];
    default:
      return [
        actions.page("Номера", "/rooms"),
        actions.page("Источники", "/hot-springs"),
        actions.page("SPA", "/spa"),
        actions.page("Мероприятия", "/events"),
        actions.whatsapp(),
      ];
  }
}
