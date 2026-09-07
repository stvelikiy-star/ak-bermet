# AK BERMET — FINAL HANDOVER RELEASE

Дата фиксации: 2026-09-07 (Asia/Bishkek)

Этот файл — актуальная точка входа для финальной сдачи AK BERMET. Исторические Stage/TODO/README-секции ниже по истории репозитория не являются текущим release status.

## 1. Release source of truth

- Repository: `stvelikiy-star/ak-bermet`
- Default branch: `main`
- Release hardening merged through PR #62.
- Final SHA должен фиксироваться после последнего handover-docs merge и повторного Production Readiness PASS.
- Runtime contract: Node.js `22.x`.
- Transactional source of truth: Supabase/PostgreSQL.
- Google Sheets: one-way reporting/export mirror, не источник публичной availability.

Правило релиза: `PLANNED != IMPLEMENTED != TESTED != MERGED != DEPLOYED != PRODUCTION VERIFIED`.

## 2. Canonical hotel data

- 169 room/object units.
- 407 official beds.
- 484 maximum capacity after owner-confirmed extra-place semantics.
- 20% prepayment.
- Check-in 13:00.
- Check-out 11:00.
- Cancellation: >=7 days — refund may be possible subject to applicable fee/admin procedure; <7 days — non-refundable; no-show — non-refundable.

Pricing safety:
- 39/39 confirmed tariff-period rows are validated.
- 154/169 room units have safe automatic room-to-price mapping.
- 14 Building 3 Standard rooms and C3-301 remain deliberately fail-closed for automatic pricing until an authoritative mapping is confirmed. No tariff may be invented.

## 3. Implemented and tested core

The current release includes and has contract/CI coverage for:

- RU / KG / EN / KZ public localization.
- Verified room master and public room catalog.
- Supabase authoritative availability.
- 60-minute durable holds and overlap protection.
- Manual booking transaction.
- SUPER Chessboard V2.
- Booking services.
- Manual payment ledger and audited void.
- Manager live-data views and analytics.
- Site CMS with publish/version controls.
- Durable public leads and AI-chat CRM handoff.
- Real-AI fail-closed provider mode.
- Supabase Auth / RBAC / RLS.
- Housekeeping lifecycle.
- Technician / maintenance lifecycle.
- Inspection and blocking controls.
- Supabase-to-Google-Sheets outbox/worker.
- Backup contract and disposable restore drill.
- Legacy-booking import guard.
- Production preflight and fail-closed cutover preflight.
- Production Next.js build and production Docker build.

## 4. Current live data facts

At the 2026-09-07 cutover audit:

- Supabase room units: 169.
- Official beds: 407.
- Maximum capacity: 484.
- Staff/Auth users: 17.
- Current Supabase bookings: 0.
- Current Supabase leads: 0.
- `23_Импорт_Брони` contains headers only; no real current booking rows were supplied.
- Google Sheets `Бронирования` contains headers only; no real current booking rows were supplied.
- Supabase-to-Sheets queue for `Номера`: 169 success, 0 pending, 0 failed, 0 stale.

Therefore the public production domain MUST NOT be cut over until current real hotel bookings are reconciled/imported. Otherwise authoritative availability would operate without the hotel's existing reservations.

## 5. Deployment state

- Exact-SHA Vercel production deployment of the pre-PR62 main was built successfully and reached READY.
- The deployment used Node 22 and full dev dependencies during build; this exposed and corrected the previous Vercel bootstrap/runtime mismatch.
- Vercel Deployment Protection / SSO is currently enabled on the project, so external browser UAT is still blocked until protection is removed for the final public environment.
- `akbermet.kg` must not be switched until the release gates below pass.

## 6. External cutover gates — fail closed

`npm run preflight:cutover` requires all of the following to be explicitly `YES`. Never set a flag based on assumption.

1. `AK_BERMET_CUTOVER_APPROVED`
2. `AK_BERMET_LIVE_BACKUP_VERIFIED`
3. `AK_BERMET_PRICING_GAPS_RESOLVED`
4. `AK_BERMET_LEGACY_BOOKINGS_RECONCILED`
5. `AK_BERMET_COTTAGES_READINESS_CONFIRMED`
6. `AK_BERMET_SHEETS_RUNTIME_VERIFIED`
7. `AK_BERMET_BROWSER_UAT_PASSED`
8. `AK_BERMET_AUTH_HARDENING_VERIFIED`
9. `AK_BERMET_MAIN_PROTECTION_VERIFIED`

### Current blockers requiring evidence or an external admin action

- Fresh live database backup immediately before production data cutover; verify hashes and restore procedure. An older 2026-08-11 backup exists but is not sufficient as the final live cutover backup.
- Real current reservations must be obtained from reception/admin, validated through `23_Импорт_Брони`, then imported/reconciled with zero overlaps.
- The 15 fail-closed pricing mappings require authoritative acceptance/resolution before the pricing gate can be marked YES.
- Cottage operational readiness requires factual owner/admin confirmation.
- GitHub `main` branch protection must be enabled and verified. As of the audit, `main` reports `protected: false`.
- GitHub Actions secrets for the scheduled Sheets Mirror must be configured; the mirror mechanism itself has live success evidence, but the latest scheduled workflow cannot start without its secrets.
- Supabase Leaked Password Protection must be enabled and verified.
- Vercel Deployment Protection / SSO must be removed or configured so the final public production domain is externally accessible.
- Full browser UAT must be performed after the final public deployment is accessible.
- Full WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff E2E must be verified for full automation handover.

## 7. Safe final cutover sequence

1. Freeze feature development.
2. Confirm final `main` SHA and Production Readiness PASS.
3. Enable/verify `main` protection.
4. Obtain and validate current real booking export.
5. Confirm unresolved price mappings / approved fail-closed policy.
6. Confirm cottage readiness state.
7. Create fresh live database backup and verify hashes/restore path.
8. Configure/verify scheduled Sheets Mirror credentials and one real successful run.
9. Enable Supabase leaked-password protection and repeat staff/auth smoke.
10. Deploy exact final SHA to Vercel production.
11. Remove production Deployment Protection / SSO only when public UAT is ready.
12. Run public browser UAT: desktop/mobile, RU/KG/EN/KZ, legal, forms, availability, redirects, robots/sitemap, no stale promo or placeholder claims.
13. Run role UAT: owner, administrator, manager, housekeeping, technician; verify forbidden routes/RLS.
14. Import/reconcile current bookings before exposing public availability.
15. Verify booking -> payment -> check-in -> checkout -> cleaning -> repair/inspection when needed -> READY.
16. Verify WhatsApp/n8n/AI full E2E and human handoff.
17. Switch `akbermet.kg` only after all required gates are evidence-backed YES and rollback path is ready.
18. Verify HTTPS, canonical host, www/non-www behavior, robots, sitemap, runtime logs and no 5xx.
19. Train owner/admin/manager/housekeeping/technician users.
20. Capture final backup, final release SHA, acceptance checklist and owner sign-off.

## 8. Rollback principle

Never overwrite or destroy the old production source as part of cutover. Keep the previous website/DNS target and the fresh database backup available until post-cutover monitoring is green and the owner accepts the release.

## 9. Handover acceptance

The project is only `FULLY HANDED OVER` when:

- production domain serves the exact accepted release;
- current bookings are present and reconciled;
- public availability is correct;
- all staff roles work and unauthorized access is denied;
- payments and operational room lifecycle work end to end;
- backup/restore evidence exists;
- Sheets mirror/scheduler is green;
- WhatsApp/n8n/AI/human-handoff E2E is green;
- browser/mobile/localization UAT is green;
- owner/staff training is complete;
- owner acceptance is recorded.
