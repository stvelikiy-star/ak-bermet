# AI Chat — архитектура (Stage 06)

AI-помощник Ак-Бермет — это безопасная заготовка: реального AI пока нет,
ответы формирует mock-движок на основе базы знаний и правил.

---

## 1. Как сейчас работает чат

1. Виджет `src/components/AiChat.tsx` (плавающая кнопка → окно).
2. Пользователь пишет сообщение или жмёт быструю кнопку.
3. Клиент отправляет `POST /api/chat` с `{ message, history, page }`.
4. `src/app/api/chat/route.ts` валидирует и вызывает `generateMockAIResponse`.
5. Ответ (`message`, `topic`, `suggestedActions`, `shouldHandoff`) отображается:
   текст + кнопки действий; при `shouldHandoff` — заметная кнопка
   «Перейти в WhatsApp к администратору».

Есть состояния: загрузка (анимация «печатает»), ошибка (бабл + WhatsApp).

## 2. Где база знаний

`src/lib/ai/knowledge-base.ts` — объект `KB`: бренд, контакты, бронирование,
отмена, заезд/выезд, что включено, источники, бассейн/зал, номера, питание,
мероприятия, акции, правила, оплата. Контакты берутся из `src/data/site.ts`.

## 3. Где правила безопасности

`src/lib/ai/chat-rules.ts`:
- `CHAT_RULES` — список системных правил (войдут в system-prompt real AI);
- `SAFE_WORDING` — готовые осторожные формулировки (бронь, оплата, источники, акции).

## 4. Как работает mock engine

`src/lib/ai/mock-ai-engine.ts` → `generateMockAIResponse({ message, page })`:
- определяет тему по ключевым словам (порядок: отмена → оплата → мероприятия →
  источники → SPA → питание → акции → контакты → номера → default);
- собирает ответ из `KB` + `SAFE_WORDING`;
- добавляет `suggestedActions` (ссылки/страницы/формы/WhatsApp);
- ставит `shouldHandoff: true` для оплаты и отмены.

Утилиты — `src/lib/ai/chat-utils.ts` (ключевые слова, id, фабрики действий).

## 5. Как заменить mock на real AI provider

В `src/app/api/chat/route.ts` стоит:

```ts
// TODO Stage 07: replace mock engine with real AI provider using knowledge base and guardrails.
```

План:
1. Собрать system-prompt из `CHAT_RULES` + сериализованного `KB`.
2. Вызвать провайдера (OpenAI / Claude) с `message` и `history`.
3. Прогнать ответ через guardrails (те же `SAFE_WORDING`, запрет реквизитов).
4. Маппить результат в тот же `ChatResponse` (контракт не меняется — UI готов).
5. Ключи — только в env, не в коде.

## 6. Поддерживаемые темы

`rooms` (номера/бронь), `hot_springs`, `spa`, `events`, `food`, `payment`,
`cancellation`, `contacts`, `promos`, `general` (default).

## 7. Когда нужен handoff к администратору

`shouldHandoff = true` для тем **оплата** и **отмена** (а также при ошибке).
В этих случаях UI показывает кнопку «Перейти в WhatsApp к администратору» с
текстом-передачей диалога (`createChatHandoffText`).

## 8. Что AI не должен говорить

- не подтверждать бронь и точное наличие;
- не отправлять реквизиты оплаты;
- не обещать лечение / медицинский результат;
- не обещать акции и скидки без подтверждения актуальности;
- спорные детские/индивидуальные условия — передавать администратору.

## 9. Следующие шаги (Stage 07)

- Подключить real AI provider за тем же контрактом `ChatResponse`.
- Вынести `KB` в system-prompt и добавить few-shot примеры.
- Лог диалогов и хендоффов в CRM (лист «FAQ база AI»).
- Возможный sentiment/abuse-фильтр и rate-limit на `/api/chat`.
