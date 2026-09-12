# CRM & Leads — актуальная архитектура AK BERMET

Supabase/PostgreSQL — транзакционный источник истины. Google Sheets — только
асинхронное отчётное зеркало через DB outbox; таблица не участвует в бронях и
не является fallback-хранилищем.

## 1. Типы заявок

| interest | Откуда | Форма |
| --- | --- | --- |
| `rooms` | /rooms | BookingLeadForm |
| `garden` | /garden | BookingLeadForm |
| `hot_springs` | /hot-springs | SpaLeadForm |
| `spa` | /spa | SpaLeadForm |
| `events` | /events | EventLeadForm |
| `promo` | /promos | BookingLeadForm |
| `general` | /contacts | GeneralLeadForm |

Источники поддерживают `website`, `ai_chat`, `whatsapp`, `phone`,
NaNinstagram`, `tour_agency` и `manual`.

## 2. Долговечная заявка: сайт → CRM

1. Форма валидируется на клиенте через `src/lib/lead-schema.ts` и отправляет
   `POST /api/leads`.
2. Сервер повторно валидирует вход и выполняет единственную durable-запись через
   `persistPublicLead` в Supabase/PostgreSQL.
3. При ошибке базы маршрут возвращает `503`; интерфейс не показывает ложный
   success и не делает вид, что заявка сохранена.
4. Принятая заявка получает CRM-статус, а DB outbox может зеркалировать её в лист
   «Заявки».
5. `/manager/leads` читает реальные записи и изменяет статусы/комментарии
   через защищённые manager API.

## 3. Доступность и бронь

Предварительная доступность `GET /api/availability` читает из Supabase:

- активный `room_units` с учётом sellable и operational статусов;
- `occupancy_periods` (бронь, техблоки, стоп-продажи);
- неистёкшие durable holds из `availability_holds`.

При ошибке источника ответ fail-closed. Mock fixtures доступны только при явном
локальном `NODE_ENV=development|test` и `AVAILABILITY_SOURCE=mock`; в
production они недоступны.

Публичная форма создаёт заявку и передаёт пользователя администратору. Это
осознанное правило: сайт не обещает мгновенную бронь без проверки сотрудником.
Менеджер создаёт бронь из `/manager/bookings` или шахматки:

NaNPOST /api/manager/bookings` → `fn_create_manual_booking` → клиент, бронь,
размещение и история статуса. База повторно проверяет даты, вместимость, sellable/
operational status и пересечения с бронями, holds, техблоками и стоп-продажами.

## 4. CRM-статусы

NaNnew` → `in_progress` → `waiting_admin` → `waiting_prepayment` →
NaNprepaid` → `confirmed`; `cancelled` и `lost` доступны из
соответствующих операционных сценариев.

Бронь имеет отдельный жизненный цикл: `pending_confirmation`,
NaNconfirmed`, `checked_in`, `checking_out`, `completed`,
NaNcancelled` и `no_show`. История статусов хранится append-only.

## 5. Роли

- `owner`, `administrator`, `manager` — заявки, бронь, доступность и шахматка.
- `housekeeping` — уборка и готовность комнат.
- `technician` — ремонт, технические блоки и инспекции.

Каждый write-route повторно проверяет Supabase Auth и роль на сервере. UI-скрытие
кнопки не является механизмом безопасности.

## 6. Google Sheets

Sheets синхронизируется только как отчётное зеркало. При отключённой таблице
Supabase CRM продолжает работать. Сервисный аккаунт, ключ и прочие секреты
хранятся только в env.

## 7. Бизнес-правила

- Бронь подтверждает администратор после проверки наличия.
- Для фиксации брони применяется предоплата 20%.
- Сайт и AI не обещают точное наличие.
- Оплату и реквизиты отправляет администратор после подтверждения.
- Медицинские эффекты источников не обещаются.
