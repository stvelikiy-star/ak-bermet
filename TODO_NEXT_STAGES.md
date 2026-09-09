# AK BERMET — текущие следующие действия

> Старый Stage 04–09 backlog завершён или заменён текущим Supabase/CRM/operations контуром. Для финальной сдачи использовать `HANDOVER_RELEASE_2026-09-08.md`.

## Уже подтверждено

- [x] Current accepted `main`: `fa8d98536ed18deef109514aae3c0179798c13fe`.
- [x] Post-merge Production Readiness для `fa8d985...` полностью PASS, включая Docker build.
- [x] PR #71 Free-plan password-policy hardening merged и CI-green.
- [x] Production/full dependency audit проходит без high vulnerabilities.
- [x] Disposable Restore Drill ранее прошёл rebuild -> backup -> fresh rebuild -> restore -> invariant verification.
- [x] Live Supabase project `ak-bermet-dev` ACTIVE_HEALTHY, migration ledger = 37.
- [x] Inventory live: 169 units / 407 official beds / 484 max capacity.
- [x] Release inventory live: 137 `ready + active`, 32 `blocked + inactive`.
- [x] 32 blocked локализованы: 17 cottages + 15 Corpus 3 pricing-gap rooms.
- [x] Audit history доказал: ровно 137 rooms прошли staging activation и все 137 остаются active; 32 не активировались.
- [x] Public availability code возвращает только application status `active`; blocked/inactive rooms исключаются.
- [x] Raw `anon` direct SELECT к `room_units` запрещён.
- [x] Auth integrity: 17 users, 17 profiles, 17 unique staff slots, 17 active role assignments, 0 orphan/missing/inactive profiles.
- [x] Role distribution: 1 owner / 1 administrator / 4 manager / 6 housekeeping / 5 technician.
- [x] SECURITY DEFINER live: 44 total / 0 anon EXECUTE / 28 authenticated role-guarded RPC.
- [x] Supabase plan = Free; HIBP/Leaked Password Protection = Pro+ optional hardening.
- [x] Sheets worker path реально отработал: 169 queue success + 169 history rows, обработка 2026-08-30.
- [x] Google Sheets `23_Импорт_Брони` и `Бронирования` — реальных строк пока нет; Supabase bookings = 0.
- [x] Vercel Node mismatch снят: `package.json engines.node = 22.x`, а Vercel docs подтверждают, что engines override Project Settings.
- [x] После сегодняшних merge новых Vercel deployments не появилось — exact current SHA ещё не развернут.
- [x] GitHub `main` повторно проверен: `protected: false`, required checks enforcement off.

## Сейчас НЕ делать

- Не добавлять новые фичи и не переделывать дизайн без release-critical причины.
- Не придумывать цены для 14 Corpus 3 Standard и `C3-301`.
- Не активировать 17 cottage units без подтверждённой готовности/owner policy.
- Не создавать фиктивные брони ради cutover gate.
- Не считать Google Sheets источником public availability.
- Не считать stale Vercel production финальным.
- Не считать Node `24.x` в Vercel Project Settings отдельным blocker: release package `engines.node = 22.x` имеет приоритет.
- Не требовать Supabase Pro только ради HIBP.
- Не удалять индексы по `unused_index` на почти пустом workload.
- Не отмечать cutover gate PASS без фактического evidence.

## Финальный release backlog

- [ ] Включить GitHub branch protection / required Production Readiness check для `main` через admin-доступ и повторно проверить `protected: true`.
- [ ] Получить реальный актуальный реестр бронирований от администратора/ресепшн **или** авторитетное подтверждение, что активных броней для переноса нет.
- [ ] Для 32 blocked units получить owner decision:
  - [ ] либо дать авторитетные данные для активации;
  - [ ] либо письменно/операционно подтвердить запуск 137 verified active rooms, оставив 32 blocked/inactive.
- [ ] Для pricing gap: не активировать 14 C3 Standard + C3-301 без подтверждённого тарифа/сопоставления.
- [ ] Для cottages: не снимать `DO_NOT_ACTIVATE` без подтверждённой готовности.
- [ ] Проверить scheduled Sheets Mirror в финальном runtime: credentials + фактический новый run.
- [ ] Сделать свежий live DB backup непосредственно перед cutover и записать SHA256/restore validation evidence.
- [ ] Развернуть exact accepted `main` SHA в Vercel production.
- [ ] Проверить, что deployment собрал текущий Next.js/dependency set и использует Node 22 из package engines.
- [ ] Сделать final deployment доступным для anonymous browser UAT.
- [ ] Провести desktop/mobile browser UAT: RU/KG/EN/KZ, legal, forms, availability, links, robots/sitemap, no 5xx.
- [ ] Провести real-session role UAT: owner/admin/manager/housekeeping/technician + denied-access checks.
- [ ] Проверить booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY.
- [ ] Проверить WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff.
- [ ] После всех evidence-backed gates выполнить `npm run preflight:cutover`.
- [ ] Переключить `akbermet.kg` только с rollback-ready target.
- [ ] После DNS cutover проверить HTTPS/canonical/www/robots/sitemap/runtime logs.
- [ ] Провести обучение персонала и зафиксировать owner acceptance.

## Optional hardening при переходе Supabase на Pro+

- [ ] Включить Leaked Password Protection / HIBP.

## Cutover gate command

```bash
npm run preflight:cutover
```

Все 9 внешних attestations должны оставаться fail-closed и выставляться в `YES` только на основании доказательств.
