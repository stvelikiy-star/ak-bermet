# Подключение реального AI (Stage 07)

AI-чат работает в двух режимах: **mock** (встроенный безопасный движок) и
**real** (OpenAI). Без ключа или при выключенных real-вызовах — всегда mock,
сайт не ломается.

---

## Как включить real AI mode

1. Скопируйте `.env.example` в `.env.local`.
2. Заполните:

```env
AI_PROVIDER=openai
AI_ENABLE_REAL_CALLS=true
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=700
```

3. Запустите:

```bash
npm run dev
```

4. Проверьте:

```bash
curl http://localhost:3000/api/chat/status
# {"provider":"openai","realCallsEnabled":true}

curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" \
  -d '{"message":"хочу номер на 4 человека"}'
```

## Как выключить real AI mode

```env
AI_PROVIDER=mock
AI_ENABLE_REAL_CALLS=false
```

---

## Как это устроено

- `src/lib/ai/providers/index.ts` — `generateAIResponse()` выбирает провайдера:
  real только если `AI_ENABLE_REAL_CALLS=true`, `AI_PROVIDER=openai` и есть
  `OPENAI_API_KEY`; иначе mock. Любая ошибка real-провайдера → fallback в mock.
- `src/lib/ai/providers/openai-provider.ts` — серверный вызов OpenAI, system-prompt
  из `src/lib/ai/system-prompt.ts` (бренд + база знаний + правила), ограничение
  истории, парсинг JSON-ответа.
- `src/lib/ai/handoff.ts` — `shouldForceHandoff()` принудительно переводит на
  администратора по чувствительным темам.
- `src/lib/ai/suggested-actions.ts` — добавляет кнопки действий по теме.

---

## Правила безопасности

- API key только в `.env.local`, не коммитится, на frontend не передаётся.
- Статус провайдера отдаётся через `/api/chat/status` без секретов.
- Real AI использует базу знаний и guardrails из system-prompt.
- При ошибке real AI — автоматический fallback в mock.
- AI не подтверждает бронь/наличие, не отправляет реквизиты, не обещает лечение.
