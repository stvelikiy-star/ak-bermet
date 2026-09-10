# AK BERMET — текущие следующие действия

> Старый Stage 04–09 backlog завершён или заменён текущим Supabase/CRM/operations контуром. Для финальной сдачи использовать `HANDOVER_RELEASE_2026-09-09.md`.

## Уже подтверждено

- [x] Accepted functional baseline: `563c79b5a78410918aaff96d85e4aa9b87d96b0a`.
- [x] Current `main` tip: `0cef608ade44904770bf14b267ca2a7d52e64fed` (documentation-only synchronization on top of the functional baseline).
- [x] Production Readiness #236 для exact `563c79b...` полностью PASS.
- [x] PR #76 merged: internal manual booking и chessboard room move имеют repository-level strict `operational_status = ready` gate.
- [x] Disposable Restore Drill #18 PASS: approved migration chain rebuilt, application-data backup/restore и DB invariants проверены на disposable Supabase.
- [x] Repository approved migration ledger = 38 migrations.
- [x] Live Supabase project `ak-bermet-dev` ранее проверен как `ACTIVE_HEALTHY`; live migration ledger = 37; latest live migration `20260830083140`.
- [x] Pending migration `20260909050000_enforce_ready_for_manual_booking_and_move.sql` ещё не применена в live БД — намеренно до fresh backup.
- [x] Inventory live: 169 units / 407 official beds / 484 max capacity.
- [x] Release inventory live: 137 `ready + active`, 32 non-sellable/blocked.
- [x] Latest live check: active bookings = 0, live availability holds = 0.
- [x] 32 blocked локализованы: 17 cottages + 15 Corpus 3 pricing-gap rooms.
- [x] Public availability исключает blocked/inactive units.
- [x] Raw `anon` direct SELECT к `room_units` запрещён.
- [x] Auth integrity ранее проверена: 17 users / 17 profiles / 17 active unique role assignments без orphan/missing profiles.
- [x] SECURITY DEFINER audit: anon EXECUTE = 0; authenticated staff RPCs остаются role/identity guarded.
- [x] Supabase organization plan = Free; HIBP/Leaked Password Protection = optional Pro+ hardening, не обязательный cutover gate.
- [x] Historical Sheets worker path реально отработал end-to-end: 169 queue success + 169 history rows на 2026-08-30.
- [x] Scheduled Sheets Mirror после scheduler fix подтверждён: runs #76–#81 PASS; последние #80/#81 прошли на `main 1f8e1e9` 2026-09-09/10.
- [x] Google Sheets booking-import surfaces и live Supabase на последней проверке не содержали активных броней для автоматического переноса.
- [x] GitHub `main` ранее проверен как `protected: false`, required checks enforcement off.
- [x] Vercel latest inspected production deployment `dpl_Fy9PqcRA4SXZwigdXjr2wuzBo38e` READY, но build source SHA `0d9feabeb42a29052ee2246633afff3c8ff79963` stale относительно current `main`.
- [x] Последний preview deployment `dpl_FjZDSEmG91hWXcKUaiPY4YiVZQDT` READY и build PASS, но source SHA `d86384d...` также старее current `main`; project Node setting = `24.x`, repository contract = `22.x`.
- [x] Vercel recent runtime error scan: no runtime error clusters found в проверенном интервале.
- [x] Release-secret presence preflight ранее показал отсутствие `VERCEL_TOKEN`, `AK_BERMET_DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `AK_BERMET_BACKUP_ENCRYPTION_KEY` в GitHub Actions secrets.
- [x] Google Drive strict search 2026-09-10 не нашёл свежего AK BERMET DB backup или отдельного authoritative reservation register.
- [x] Публичный `akbermet.kg` по проверке 2026-09-10 всё ещё обслуживает legacy site; cutover нового release не подтверждён.

## Сейчас НЕ делать

- Не добавлять новые фичи и не переделывать дизайн без release-critical причины.
- Не придумывать цены для 14 Corpus 3 Standard и `C3-301`.
- Не активировать 17 cottage units без подтверждённой готовности/owner policy.
- Не создавать фиктивные брони ради cutover gate.
- Не считать Google Sheets источником public availability.
- Не считать stale Vercel production финальным.
- Не применять 38-ю live migration до fresh recoverable backup.
- Не отмечать cutover gate PASS без фактического evidence.
- Не переключать `akbermet.kg` до final rollback-ready acceptance.

## Финальный release backlog

- [ ] Включить GitHub branch protection / required Production Readiness check для `main` через admin-доступ и повторно проверить `protected: true`.
- [ ] Получить реальный актуальный реестр бронирований от администратора/ресепшн **или** авторитетное подтверждение, что активных броней для переноса нет.
- [ ] Для 32 blocked units получить owner decision:
  - [ ] либо дать авторитетные данные для активации;
  - [ ] либо письменно/операционно подтвердить запуск 137 verified active rooms, оставив 32 blocked/inactive.
- [ ] Для pricing gap: не активировать 14 C3 Standard + C3-301 без подтверждённого тарифа/сопоставления.
- [ ] Для cottages: не снимать `DO_NOT_ACTIVATE` без подтверждённой готовности.
- [x] Scheduled Sheets Mirror подтверждён post-fix: #76–#81 PASS; это больше не blocker.
- [ ] Сделать свежий live DB `pg_dump` непосредственно перед live migration/cutover и записать checksum + archive/restore validation evidence.
- [ ] После backup применить approved migration `20260909050000_enforce_ready_for_manual_booking_and_move.sql`.
- [ ] После migration проверить live ledger = 38, обе RPC имеют strict ready-only gate, inventory counts не изменились и новые ошибки advisors отсутствуют/объяснены.
- [ ] Развернуть exact accepted GREEN `main` SHA в Vercel production/production-candidate.
- [ ] Проверить build source SHA, dependency set, Node 22 runtime contract и отсутствие 5xx/runtime errors.
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

Все внешние attestations должны оставаться fail-closed и выставляться в `YES` только на основании доказательств.
