import { normalize } from "./chat-utils";

// Темы/слова, требующие перевода на администратора.
const HANDOFF_KEYWORDS = [
  "оплат",
  "реквизит",
  "карт",
  "qr",
  "точное наличие",
  "точно свободно",
  "подтвердить бронь",
  "подтвердите бронь",
  "возврат",
  "вернуть деньги",
  "жалоб",
  "скидк",
  "бюджет",
  "противопоказан",
  "ранний заезд",
  "поздний выезд",
  "ранний заезд/поздний выезд",
];

// Возвращает true, если вопрос требует участия администратора.
export function shouldForceHandoff(message: string, aiText?: string): boolean {
  const text = normalize(`${message} ${aiText ?? ""}`);
  return HANDOFF_KEYWORDS.some((k) => text.includes(normalize(k)));
}
