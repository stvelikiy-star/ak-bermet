# Авторизация менеджера + сохранение в Google Sheets (Stage 09)

## 1. Как работает простой manager auth

PIN-защита через env. `/manager/*` закрыт `middleware.ts`: без валидной cookie
→ redirect на `/manager/login`. Вход: `POST /api/manager/login` сверяет PIN с
`MANAGER_ACCESS_PIN` и ставит httpOnly-cookie с производным значением сессии
(сам PIN в cookie не хранится). Проверка — `src/lib/manager-auth.ts` (работает и
в Edge-middleware, и в Node-роутах).

## 2. Какие env нужны

```env
MANAGER_AUTH_ENABLED=true
MANAGER_ACCESS_PIN=123456
MANAGER_SESSION_COOKIE=akbermet_manager_session
MANAGER_SESSION_HOURS=12
GOOGLE_SHEETS_LEAD_HISTORY_SHEET_NAME=История заявок
```

## 3. Как войти

Открыть `/manager` → редирект на `/manager/login` → ввести PIN из `.env.local`
→ при успехе редирект на `/manager`.

## 4. Почему это MVP, а не production auth

Один общий PIN, без пользователей и ролей, без хеширования паролей и брутфорс-
защиты. Подходит только для демо/MVP. **Для production нужна нормальная
авторизация с ролями** (owner/manager), хранилище пользователей и т. п.

## 5. Заявки из Google Sheets

`GET /api/manager/leads`: при `GOOGLE_SHEETS_ENABLED=true` читает лист «Заявки»
через `getLeadsFromSheet()`; иначе отдаёт mock и помечает ответ `source:"mock"`
(в UI — бейдж «Mock mode»).

## 6. Как меняются статусы

В деталях заявки — выбор статуса + комментарий → «Сохранить изменения» →
`PATCH /api/manager/leads/[id]`. При включённом Sheets вызывается
`updateLeadStatusInSheet()`: находит строку по ID, обновляет Статус, Менеджер,
Комментарий менеджера, Дата последнего обновления.

## 7. История заявок

После каждого обновления `appendLeadHistoryToSheet()` добавляет строку в лист
«История заявок»: ID истории, ID заявки, Дата, Статус, Менеджер, Комментарий.

## 8. Какие листы нужны в Google Sheets

«Заявки» (+ колонки Менеджер, Комментарий менеджера, Дата последнего обновления),
«История заявок», а также «Номерной фонд», «Занятость», «Оплаты», «Услуги и
цены» (см. `GOOGLE_SHEETS_SETUP.md`).

## 9. Что делать, если Google Sheets выключен

Всё работает на mock: заявки из `manager-mock`, сохранение возвращает ok без
записи, UI показывает «Mock mode». Сайт не ломается.

## 10. Что нужно для настоящего production auth

NextAuth / Supabase Auth или собственный провайдер, роли и права, хранилище
пользователей, защита от перебора, аудит входов. Текущая PIN-защита это не
заменяет.

> Текущая PIN-защита подходит только для MVP/демо. Для production нужна
> нормальная авторизация с ролями.

## Важно про middleware и env

`src/middleware.ts` выполняется в Edge-runtime, который **инлайнит значения
`process.env` во время сборки**. Поэтому:

- при `npm run dev` middleware читает env в рантайме — защита работает сразу;
- при `npm run build` / `npm start` переменные `MANAGER_AUTH_ENABLED` и
  `MANAGER_ACCESS_PIN` должны присутствовать **на момент сборки** (через
  `.env.local` или окружение CI), иначе редирект не активируется.

Node-роуты `/api/manager/*` читают env в рантайме и помечены
`export const dynamic = "force-dynamic"`, поэтому проверяют сессию всегда.
