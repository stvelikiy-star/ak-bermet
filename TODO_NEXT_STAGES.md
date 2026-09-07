# AK BERMET — текущие следующие действия

> **SUPERSEDED:** старый Stage 04–09 backlog завершён или архитектурно заменён текущим Supabase/CRM/operations контуром. Историю старого плана смотрите в Git history. Для финальной сдачи используйте `HANDOVER_RELEASE_2026-09-07.md`.

## Сейчас НЕ делать

- Не добавлять новые фичи и не переделывать дизайн без критической причины.
- Не считать Google Sheets источником публичной availability.
- Не придумывать тарифы для 14 Standard корпуса 3 и C3-301.
- Не включать домен до импорта/сверки реальных текущих броней.
- Не отмечать cutover gate PASS без фактического evidence.

## Финальный release backlog

- [ ] Зафиксировать final `main` SHA после handover-docs merge и Production Readiness PASS.
- [ ] Включить и проверить GitHub branch protection для `main`.
- [ ] Получить реальный актуальный реестр бронирований от администратора/ресепшн.
- [ ] Заполнить и провалидировать `23_Импорт_Брони`; 0 дублей, 0 пересечений, суммы/оплаты сверены.
- [ ] Импортировать и повторно сверить актуальные брони до публичного cutover.
- [ ] Получить финальное подтверждение политики для 15 fail-closed room→price mappings.
- [ ] Подтвердить фактическую готовность/статус коттеджного фонда.
- [ ] Сделать свежий live DB backup непосредственно перед cutover; проверить hashes/restore path.
- [ ] Восстановить GitHub Actions secrets для scheduled Sheets Mirror и получить реальный зелёный run.
- [ ] Включить Supabase Leaked Password Protection и повторить auth/role smoke.
- [ ] Развернуть exact final SHA в Vercel production.
- [ ] Снять/настроить Vercel Deployment Protection для публичного production URL.
- [ ] Провести desktop/mobile browser UAT, RU/KG/EN/KZ, legal, forms, availability, robots/sitemap, links, no 5xx.
- [ ] Провести финальный role UAT: owner/admin/manager/housekeeping/technician + denied-access checks.
- [ ] Проверить booking → payment → check-in → checkout → cleaning → maintenance/inspection → READY.
- [ ] Проверить WhatsApp → webhook → n8n → AI → durable CRM lead → manager notification → human handoff.
- [ ] После всех evidence-backed gates переключить `akbermet.kg` с rollback-ready конфигурацией.
- [ ] Проверить HTTPS/canonical/www/robots/sitemap/runtime logs после DNS cutover.
- [ ] Провести обучение персонала и зафиксировать owner acceptance.

## Cutover gate command

```bash
npm run preflight:cutover
```

Команда обязана fail-closed, пока все 9 внешних release attestations не выставлены точным `YES` на основании доказательств.
