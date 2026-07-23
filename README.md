# AK BERMET — SPA & WELLNESS

Сайт курортного SPA & Wellness комплекса на Иссык-Куле на **Next.js 14
(App Router) + TypeScript + Tailwind CSS**. Mobile-first, контент вынесен в
data-файлы, секции — отдельные компоненты. AI-чат и WhatsApp-CTA на главный
номер **+996 501 772233**.

## Current status

```txt
AK BERMET v4 — build passed, demo-ready after visual QA (Stage 09.5).
Подключён реальный логотип, проведена визуальная чистка, тексты и footer
проверены, mobile-QA выполнен. Реальные фото можно добавлять постепенно.
```

## How to run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Production preview

```bash
npm run build
npm run start    # локальный предпросмотр продакшен-сборки
```

## Important

```txt
Это Next.js-приложение, а не статический HTML.
Его НЕЛЬЗЯ открыть двойным кликом по index.html — такого файла нет.
Нужно запустить сервер: `npm run dev` (разработка) или
`npm run build && npm run start` (продакшен-предпросмотр),
затем открыть http://localhost:3000 в браузере.
```

## Demo checklist (что показать заказчику)

Публичные страницы:

- `/`            — главная (hero, направления, источники, SPA, Garden, акция, FAQ)
- `/rooms`       — номера и коттеджи + форма брони (`/rooms#booking-form`)
- `/garden`      — Garden Rooms 2026 + форма брони (`/garden#booking-form`)
- `/hot-springs` — горячие источники (цены, правила)
- `/spa`         — SPA & Wellness + форма записи (`/spa#spa-form`)
- `/events`      — залы и мероприятия + форма (`/events#event-form`)
- `/food`        — питание и рестораны
- `/promos`      — акции (с оговоркой про периоды)
- `/contacts`    — контакты + форма + 2GIS
- `/faq`         — частые вопросы

Проверить вживую:

- Логотип в шапке и подвале (золотой, на тёмном фоне).
- Все кнопки «Забронировать / WhatsApp» ведут на `wa.me/996501772233`.
- AI-чат: открыть, нажать быстрые кнопки, проверить переход в WhatsApp.
- Формы: отправить заявку → экран «Заявка принята» → «Продолжить в WhatsApp».
- Mobile (360–430px): нет горизонтального скролла, кнопка чата не мешает.

Демо менеджера (MVP, помечен как демо):

- `/staff/login` — вход персонала через Supabase Auth (email/пароль)
- `/manager`, `/manager/leads`, `/manager/availability`,
  `/manager/rooms`, `/manager/payments`, `/manager/reports`, `/manager/settings`

## Структура

```
src/
  app/
    layout.tsx          корневой layout, шрифты, мета
    page.tsx            сборка секций по порядку
    globals.css         токены, утилиты, шрифты (@import)
  components/
    layout/
      Header.tsx        тёмная шапка, меню, WhatsApp, моб. меню + «Бронь»
      Footer.tsx        контакты, меню, карта (2GIS), соцсети
    sections/
      HeroSection.tsx
      MiniBenefitsSection.tsx     полоса преимуществ
      QuickDirectionsSection.tsx  6 карточек направлений
      WhyChooseSection.tsx
      RoomsSection.tsx            5 категорий + note о наличии
      WellnessSection.tsx         источники + SPA
      GardenSection.tsx           Garden Rooms 2026
      EventsSection.tsx           залы, оборудование, кофе-брейк
      FoodSection.tsx             расписание + заведения
      PromoSection.tsx            акция
      ReviewsSection.tsx          нейтральные отзывы (без фейк-имён)
      FAQSection.tsx              9 реальных Q&A
      ContactsSection.tsx
    ui/
      Logo / SectionHeading / Photo / icons
    AiChat.tsx          плавающий AI-помощник (UI-плейсхолдер)
  data/
    site.ts             контакты + WhatsApp-ссылки + навигация (ЦЕНТР)
    home.ts             hero-факты, преимущества, направления, отзывы, акция
    rooms.ts            номера + Garden
    wellness.ts         источники + SPA
    events.ts           залы, оборудование, кофе-брейк
    food.ts             расписание + заведения
    faq.ts              вопросы/ответы
```

## Где что менять

- **Телефон, WhatsApp-ссылки, адрес, 2GIS, email** — только `src/data/site.ts`.
  Готовые ссылки: `WA.availability`, `WA.booking`, `WA.rooms`, `WA.springs`,
  `WA.spa`, `WA.events`, `WA.promo` (с предзаполненным текстом обращения).
- **Контент секций** — соответствующие файлы в `src/data/`.
- **Цвета** — `tailwind.config.ts` (изумруд, золото, молочный, бежевый).
- **Фото** — сейчас это плейсхолдеры с Unsplash. Замените URL в data-файлах на
  реальные снимки (положите в `public/`, например `/images/garden.jpg`).
  При ошибке загрузки показывается фирменный градиент-заглушка.

## Что плейсхолдер

- AI-чат (`AiChat.tsx`) — UI с локальными ответами; реальная логика на Stage 03.
- Изображения — Unsplash; нужны реальные фото курорта.
- Карта — кликабельный блок-заглушка, ведёт на 2GIS.
- Соцсети в футере — текстовые плейсхолдеры (IG/FB/YT/TT).

## Осторожные формулировки

В текстах нет обещаний точного наличия, конкретного номера, лечебного эффекта
или вечной актуальности акций — используются «уточняйте у администратора»,
«финальное наличие подтверждается после проверки», «акции действуют в
определённые периоды».

---

## Stage 03 — внутренние страницы

Добавлены роуты (App Router, статическая генерация, у каждого свои SEO-метаданные):
`/rooms`, `/garden`, `/hot-springs`, `/spa`, `/events`, `/food`, `/promos`,
`/contacts`, `/faq`.

Header/Footer/AiChat вынесены в общий `layout.tsx` — теперь на всех страницах.
Навигация переведена на реальные роуты (`src/data/navigation.ts`) с подсветкой
активного пункта и `next/link`.

Новые общие компоненты: `sections/PageHero`, `sections/PageCTA`,
`ui/Container`, `ui/InfoCard`, `ui/PriceCard`, `ui/FeatureGrid`, `ui/FaqAccordion`.

Новые/расширенные data-файлы: `navigation.ts`, `promos.ts`, плюс разделы для
страниц в `rooms.ts`, `wellness.ts`, `events.ts`, `food.ts`, `faq.ts`, `site.ts`.

---

## Stage 04 — заявки и CRM-структура

Формы заявок (валидация на клиенте + mock API + success + «Продолжить в WhatsApp»):
`BookingLeadForm`, `EventLeadForm`, `SpaLeadForm`, `GeneralLeadForm`
(+ `FormSuccess`, `FormError`, общие поля `forms/fields.tsx`, хук `useLeadForm`).

Размещены: `/rooms`, `/garden` (Garden люкс), `/hot-springs`, `/spa`, `/events`,
`/contacts`, `/promos`.

API (mock, без БД): `POST /api/leads` (валидация name/phone/interest/source,
лог в консоль, `{ ok, leadId }`), `GET /api/availability` (осторожное сообщение +
demo-варианты).

Типы: `src/types/lead.ts`, `src/types/availability.ts`.
Lib: `src/lib/lead-schema.ts`, `lead-utils.ts`, `whatsapp.ts`, `availability.ts`.
Подробности и план Google Sheets — в `CRM_AND_LEADS_ARCHITECTURE.md`.

AI-чат: быстрые кнопки ведут на разделы (`/rooms#booking-form`, `/hot-springs`,
`/spa`, `/events`) + WhatsApp; добавлены осторожные формулировки.

### Проверка API
```bash
npm start   # затем:
curl -X POST localhost:3000/api/leads -H "Content-Type: application/json" \
  -d '{"name":"Тест","phone":"+996501112233","interest":"rooms","source":"website"}'
curl "localhost:3000/api/availability?guests=2&category=люкс"
```

---

## Stage 05 — Google Sheets для заявок

`POST /api/leads` пишет заявки в Google-таблицу (лист «Заявки») через
`src/lib/google-sheets.ts` (`googleapis`, сервисный аккаунт). Включается флагом
`GOOGLE_SHEETS_ENABLED=true` + креды (`GOOGLE_SHEETS_SPREADSHEET_ID`,
`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`).

Режимы:
- выключено → mock: заявка логируется (`Google Sheets disabled. Lead saved in mock mode.`), ответ `{ ok:true, leadId }`;
- включено + успех → строка в листе «Заявки», `{ ok:true, leadId }`;
- включено + ошибка → `{ ok:false, message:"Заявка принята не была…" }`, детали только в логе сервера.

`GET /api/availability`: при включённом Sheets читает «Номерной фонд»/«Занятость»
(`getRoomsFromSheet`/`getOccupancyFromSheet`), иначе mock; всегда осторожный
message. Настройка: `GOOGLE_SHEETS_SETUP.md` и `.env.example`.

---

## Stage 06 — архитектура AI-чата

AI-чат отправляет сообщения в `POST /api/chat`, который классифицирует тему по
ключевым словам и отвечает из базы знаний (`src/lib/ai/knowledge-base.ts`) с
осторожными формулировками (`src/lib/ai/chat-rules.ts`). Движок —
`src/lib/ai/mock-ai-engine.ts` (`generateMockAIResponse`).

UI (`src/components/AiChat.tsx`): история, loading/error, быстрые кнопки,
suggested actions из API, кнопка «Перейти в WhatsApp к администратору» при
`shouldHandoff`. Темы: rooms, hot_springs, spa, events, food, payment,
cancellation, contacts, promos, general. Подробнее — `AI_CHAT_ARCHITECTURE.md`.
Реальный AI пока не подключён (TODO Stage 07, контракт `ChatResponse` готов).

---

## Stage 09.5 — визуальная чистка, логотип и подготовка к показу

- Подключён реальный логотип (`/public/images/brand/logo-ak-bermet.png`,
  золотой горизонтальный лок) в Header и Footer. Адаптивный размер,
  безопасный текстовый fallback при отсутствии файла.
  Варианты: `-light` (для очень тёмного фона), `-stacked` (вертикальный),
  `logo-mark` (только знак).
- Footer: убраны неработающие ссылки `#` (документы показаны как текст-TODO),
  год динамический, соцсети скрыты до появления реальных аккаунтов.
- Тексты вычитаны: убраны случайные англоязычные вставки; сохранены осторожные
  формулировки (наличие и бронь подтверждает администратор, предоплата 20%,
  источники — оздоровительные процедуры без мед-гарантий, акции — по периодам).
- Все WhatsApp-CTA идут на `wa.me/996501772233` (через `src/data/site.ts`).
- Manager помечен как демо/MVP; mock-данные подписаны; PIN и секреты не светятся.
- Реальные фото: складывать в `public/images/<раздел>/`, см. `public/images/README.md`.
  Сейчас атмосферные фото временно с Unsplash (помечено TODO), fallback — фирменный
  градиент, поэтому сайт не падает без фото.

---

## Legal pages

Юридический раздел (Stage 10), только на русском (мультиязычность — отдельный этап):

```txt
/legal/public-offer   — Публичная оферта
/legal/privacy        — Политика конфиденциальности
/legal/terms          — Условия использования сайта
/legal/refund         — Возврат и отмена бронирования
```

Ссылки на эти страницы добавлены: в Footer (блок «Документы» + нижняя строка),
под каждой формой заявки (компонент `LegalConsent`), в `sitemap.ts`, а также
учтены в ответах AI-ассистента (тема «legal»).

Компоненты раздела: `src/components/legal/LegalPageLayout.tsx`,
`LegalSection.tsx`, `LegalNotice.tsx`, `LegalConsent.tsx`.
Данные и реквизиты: `src/data/legal.ts` (контакты берутся из `src/data/site.ts`).

> Юридические тексты являются рабочей редакцией и должны быть согласованы с
> владельцем/юристом перед публикацией как официальные документы.
> Банковские реквизиты на сайте не публикуются — их отправляет администратор
> после проверки наличия и согласования условий.

### TODO для будущего payment/checkout flow

При подключении реальной оплаты (FreedomPay и т.п.) показывать ссылку на
`/legal/public-offer` и `/legal/refund` на шаге оплаты и фиксировать согласие
с офертой перед списанием предоплаты.

### Pre-deploy checklist (юридическая часть)

```txt
- Проверить юридические данные компании (ОсОО «Акбермет»).
- Проверить адрес.
- Проверить телефон.
- Проверить условия предоплаты (20%).
- Проверить условия возврата (14+ / 7–14 / <7 дней).
- Утвердить публичную оферту.
- Утвердить политику конфиденциальности.
```

---

## Exploration-first UX (Stage 11.5)

Сайт построен по принципу «сначала знакомство, потом контакт». Клиент сперва
изучает объект, номера, SPA, источники, мероприятия, питание и Garden — и только
после ознакомления переходит в WhatsApp, чат-бот или форму заявки.

Логика каждого раздела:

```txt
Карточка / раздел → «Подробнее / Обзор» → фото + описание + условия + преимущества
→ CTA «Узнать наличие / Забронировать в WhatsApp»
```

Правила:

- Карточки номеров, SPA, мероприятий, источников и питания **не открывают WhatsApp
  сразу**. Первичная кнопка ведёт на обзорную/детальную страницу.
- WhatsApp остаётся, но как **второе действие** после информации.
- На главной для каждого блока две кнопки: «Подробнее …» (на раздел) и
  «Узнать наличие / Уточнить …» (WhatsApp или форма).
- Все WhatsApp-ссылки ведут на один номер (`996501772233`), но текст обращения
  контекстный (номера, Garden, SPA, источники, мероприятия, питание, акции) —
  см. `src/data/site.ts` → `WA`.

Детальные страницы номеров (`/rooms/[slug]`):

```txt
/rooms/standard-building-1
/rooms/standard-building-2
/rooms/lux-building-2
/rooms/semilux-building-3
/rooms/lux-building-3
/rooms/garden-lux
/rooms/cottages
```

Каждая содержит: breadcrumbs, hero, галерею, описание, ключевые факты, удобства,
важные условия, CTA «Узнать наличие» и ссылки на оферту/возврат. Контент — в
`src/data/room-details.ts`.

Иконка WhatsApp — единый компонент `src/components/ui/WhatsAppIcon.tsx`,
использующий `/public/icons/whatsapp-glyph-black.svg`. Не использовать emoji,
старые inline-иконки или lucide `MessageCircle` как WhatsApp.

## Image folders

Реальные фотографии загружать в соответствующие папки (сейчас используются
аккуратные плейсхолдеры; при ошибке загрузки изображения компонент `Photo`
показывает фирменный fallback, сайт не ломается):

```txt
/public/images/rooms/         — номера и коттеджи (детальные страницы)
/public/images/garden/        — Garden Lux 2026
/public/images/spa/           — SPA & Wellness
/public/images/hot-springs/   — горячие источники
/public/images/events/        — конференц-залы и мероприятия
/public/images/food/          — питание и рестораны
/public/images/placeholders/  — общие плейсхолдеры
```

После загрузки реальных файлов замените Unsplash-ссылки (поля `img` / `src`) в
`src/data/rooms.ts`, `src/data/room-details.ts` и `src/data/wellness.ts` на
локальные пути вида `/images/rooms/standard-1.jpg`.
