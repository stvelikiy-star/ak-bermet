import type { ChatSuggestedAction, ChatTopic } from "@/types/chat";
import type { Locale } from "@/i18n/locale";
import { t } from "@/i18n/dictionary";
import { actions } from "./chat-utils";

// Возвращает suggested actions по теме ответа.
export function actionsForTopic(
  topic?: ChatTopic,
  locale: Locale = "ru"
): ChatSuggestedAction[] {
  const whatsapp = () =>
    actions.whatsapp(t("Написать в WhatsApp", locale), undefined, locale);

  switch (topic) {
    case "rooms":
    case "booking":
      return [
        actions.leadForm(t("Оставить заявку", locale), "/rooms#booking-form"),
        actions.whatsapp(t("WhatsApp администратору", locale), undefined, locale),
      ];
    case "garden":
      return [
        actions.leadForm(t("Узнать Garden Rooms", locale), "/garden#booking-form"),
        whatsapp(),
      ];
    case "hot_springs":
      return [
        actions.page(t("Цены источников", locale), "/hot-springs"),
        whatsapp(),
      ];
    case "spa":
      return [
        actions.leadForm(t("Записаться в SPA", locale), "/spa#spa-form"),
        whatsapp(),
      ];
    case "events":
      return [
        actions.leadForm(t("Заявка на мероприятие", locale), "/events#event-form"),
        whatsapp(),
      ];
    case "food":
      return [actions.page(t("Питание и рестораны", locale), "/food"), whatsapp()];
    case "promos":
      return [actions.page(t("Смотреть акции", locale), "/promos"), whatsapp()];
    case "contacts":
      return [actions.page(t("Открыть контакты", locale), "/contacts"), whatsapp()];
    case "payment":
    case "cancellation":
      return [
        actions.handoff(
          undefined,
          locale,
          t("Перейти в WhatsApp к администратору", locale)
        ),
      ];
    case "legal":
      return [
        actions.page(t("Публичная оферта", locale), "/legal/public-offer"),
        actions.page(t("Возврат и отмена", locale), "/legal/refund"),
        whatsapp(),
      ];
    default:
      return [
        actions.page(t("Номера", locale), "/rooms"),
        actions.page(t("Источники", locale), "/hot-springs"),
        actions.page("SPA", "/spa"),
        actions.page(t("Мероприятия", locale), "/events"),
        whatsapp(),
      ];
  }
}
