# AK BERMET — текущие следующие действия

> Старый Stage 04–09 backlog завершён или архитектурно заменён текущим Supabase/CRM/operations контуром. Для финальной сдачи используйте `HANDOVER_RELEASE_2026-09-08.md`.

## Уже подтверждено

- [x] Текущий pre-docs `main` SHA `02fa3ac8777755cffdd276e2a7794f3c9cb2bc5d` прошёл post-merge Production Readiness полностью, включая Docker build.
- [x] Production и полный dependency audit проходят без high vulnerabilities.
- [x] Disposable Restore Drill прошёл rebuild -> backup -> fresh rebuild -> restore -> invariant verification.
- [x] Supabase live inventory сверён: 169 units / 407 official beds / 484 max capacity.
- [x] Активная V6-структура сверена: 7 активных inventory groups; исторический Corpus 4 soft-deleted.
- [x] Staff/Auth live count сверён: 17 users/active role assignments.
- [x] Sheets queue live status: 169 success.

## Сейчас НЕ делать

- Не добавлять новые фичи и не переделывать дизайн без release-critical причины.
- Не считать Google Sheets источником публичной availability.
- Не придумывать тарифы для fail-closed room-to-price mappings.
- Не включать публичный домен до сверки реальных текущих броней.
- Не считать текущий Vercel production финальным: он собран со старого SHA `e0407c3...`.
- Не отмечать cutover gate PASS без фактического evidence.
- Не удалять индексы только по `unused_index` advisor на почти пустой operational workload.

## Финальный release backlog

- [ ] Merge handover-docs PR и получить новый final `main` SHA.
- [ ] Получить post-merge Production Readiness PASS на новом final SHA.
- [ ] Включить и проверить GitHub branch protection / required checks для `main`.
- [ ] Включить Supabase Leaked Password Protection и повторить auth/role denial smoke.
- [ ] Получить реальный актуальный реестр бронирований от администратора/ресепшн.
- [ ] Заполнить и провалидировать `23_Импорт_Брони`; 0 дублей, 0 пересечений, суммы/оплаты сверены.
- [ ] Импортировать и повторно сверить актуальные брони до публичного cutover.
- [ ] Получить авторитетное решение/acceptance для fail-closed room-to-price mappings.
- [ ] Подтвердить фактическую готовность/статус коттеджного фонда.
- [ ] Проверить scheduled Sheets Mirror в финальном runtime окружении.
- [ ] Сделать свежий live DB backup непосредственно перед cutover; проверить hash/restore evidence.
- [ ] Развернуть exact final SHA в Vercel production.
- [ ] Проверить Deployment Protection/public access для browser UAT.
- [ ] Провести desktop/mobile browser UAT: RU/KG/EN/KZ, legal, forms, availability, robots/sitemap, links, no 5xx.
- [ ] Провести финальный role UAT: owner/admin/manager/housekeeping/technician + denied-access checks.
- [ ] Проверить booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY.
- [ ] Проверить WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff.
- [ ] После всех evidence-backed gates переключить `akbermet.kg` с rollback-ready конфигурацией.
- [ ] Проверить HTTPS/canonical/www/robots/sitemap/runtime logs после DNS cutover.
- [ ] Провести обучение персонала и зафиксировать owner acceptance.

## Cutover gate command

```bash
npm run preflight:cutover
```

Команда обязана fail-closed, пока все 9 внешних release attestations не выставлены точным `YES` на основании доказательств.
