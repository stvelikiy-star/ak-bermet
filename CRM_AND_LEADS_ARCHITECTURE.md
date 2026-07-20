# CRM & Leads — архитектура (Stage 04)

Документ описывает модель заявок, текущий mock-поток и план интеграции с
Google Sheets / CRM на Stage 05.

---

## 1. Типы заявок (interest)

| interest      | Откуда                         | Форма             |
| ------------- | ------------------------------ | ----------------- |
| `rooms`       | /rooms                         | BookingLeadForm   |
| `garden`      | /garden                        | BookingLeadForm   |
| `hot_springs` | /hot-springs                   | SpaLeadForm       |
| `spa`         | /spa                           | SpaLeadForm       |
| `events`      | /events                        | EventLeadForm     |
| `promo`       | /promos                        | BookingLeadForm   |
| `general`     | /contacts                      | GeneralLeadForm   |
| `food`        | (зарезервировано)              | —                 |

Источник (`source`) сейчас всегда `website`. Поддерживаются также `ai_chat`,
`whatsapp`, `phone`, `instagram`, `tour_agency`, `manual`.

---

## 2. Какие поля собираются

Базовые (всегда): `name`, `phone`, `interest`, `source`.

Проживание (`BookingLeadForm`): `checkIn`, `checkOut`, `adults`, `children`,
`childrenAges`, `roomCategory`, `wantsDoubleBed`, `needsExtraBed`, `needsWifi`,
`needsLowerFloor`, `message`.

Мероприятия (`EventLeadForm`): `checkIn` (дата), `eventType`, `guestsCount`,
`hallSize`, `message` (включая потребность в проживании / питании / кофе-брейке).

SPA / источники (`SpaLeadForm`): `spaService`, `checkIn` (дата визита),
`guestsCount`, `message`.

Общий вопрос (`GeneralLeadForm`): тема + `message`.

Полная схема — в `src/types/lead.ts`.

---

## 3. Как сейчас работает mock-поток

1. Пользователь заполняет форму → клиентская валидация (`src/lib/lead-schema.ts`).
2. `POST /api/leads` (`src/app/api/leads/route.ts`):
   - повторно валидирует `name`, `phone`, `interest`, `source`;
   - присваивает `id` и `createdAt`, ставит `status = "new"`;
   - логирует заявку в server console;
   - возвращает `{ ok: true, leadId }`.
3. Форма показывает success-состояние и предлагает «Продолжить в WhatsApp»
   с уже собранным текстом (`src/lib/whatsapp.ts`).

Предварительная проверка наличия: `GET /api/availability` возвращает demo-варианты
и осторожное сообщение (никаких «свободно/занято»).

> Данные пока **не сохраняются** — только лог в консоль сервера.

---

## 4. Как подключить Google Sheets на Stage 05

В `src/app/api/leads/route.ts` есть точка:

```ts
// TODO Stage 05: send this lead to Google Sheets and notify admin.
```

План:
1. Сервисный аккаунт Google + доступ к таблице.
2. Серверная функция `appendLeadToSheet(lead)` (вызов в route после валидации).
3. Уведомление администратора (WhatsApp/Telegram/email) — отдельный модуль.
4. В `src/lib/availability.ts` заменить `mockRooms`/`queryAvailability` на чтение
   листов «Номерной фонд» и «Занятость» (там стоит соответствующий TODO).

Домен и контакты берутся из `src/data/site.ts`, WhatsApp-тексты — из
`src/lib/whatsapp.ts`. Ключи и токены должны лежать в переменных окружения
(`.env`), не в коде.

---

## 5. Нужные листы (Google Sheets)

1. **Номерной фонд** — соответствует `RoomUnit` (`src/types/availability.ts`).
2. **Занятость** — соответствует `OccupancyRecord`.
3. **Заявки** — соответствует `Lead`.
4. **Оплаты** — статусы предоплаты 20% (Stage 07, FreedomPay).
5. **Услуги и цены** — источники, SPA, залы, кофе-брейк.
6. **FAQ база AI** — вопросы/ответы для Stage 05 (AI Chat).

---

## 6. Статусы заявок (LeadStatus)

`new` → `in_progress` → `waiting_admin` → `waiting_prepayment` → `prepaid`
→ `confirmed` · и `cancelled` / `lost` на любом этапе.

---

## 7. Бизнес-правила (зашиты в тексты)

- Бронь подтверждается только после проверки администратором.
- Для фиксации брони нужна предоплата 20%.
- Сайт/AI не обещают точное наличие.
- Реквизиты оплаты не публикуются в формах; оплату отправляет администратор
  после подтверждения наличия.
- Акции действуют только в определённые периоды.
- Медицинские эффекты источников не обещаются.

---

## Обновление Stage 05 — Google Sheets подключён

- `POST /api/leads` теперь пишет заявку в лист «Заявки» через `src/lib/google-sheets.ts`
  (`appendLeadToSheet`) при наличии env-переменных; иначе — fallback-лог (заявка не
  теряется), ответ содержит флаг `stored`.
- Порядок колонок — константа `leadToRow`. Для Stage 06 добавлены
  `ROOMS_HEADER` и `OCCUPANCY_HEADER`.
- Настройка — `GOOGLE_SHEETS_SETUP.md` и `.env.example`
  (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`).
- Дальше: чтение доступности из листов «Номерной фонд» / «Занятость» и
  уведомление администратора.
