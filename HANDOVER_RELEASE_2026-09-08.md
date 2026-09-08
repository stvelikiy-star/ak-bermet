# AK BERMET — FINAL HANDOVER RELEASE

Дата фиксации: 2026-09-08 (Asia/Bishkek)

Этот файл — текущая точка входа для финальной сдачи AK BERMET. Старые Stage/TODO/README и `HANDOVER_RELEASE_2026-09-07.md` являются историческими снимками, а не текущим release status.

## 1. Release source of truth

- Repository: `stvelikiy-star/ak-bermet`.
- Default branch: `main`.
- Current pre-docs code baseline: `02fa3ac8777755cffdd276e2a7794f3c9cb2bc5d`.
- PR #68: release/security hardening merged.
- PR #69: Actions/lint/dependency-audit modernization merged.
- Post-merge Production Readiness for `02fa3ac...`: PASS through Docker build.
- Runtime contract: Node.js `22.x`.
- Application stack: Next.js `15.5.25`, TypeScript, Tailwind CSS.
- Transactional source of truth: Supabase/PostgreSQL.
- Google Sheets: one-way reporting/export mirror; never the public availability authority.

Release rule: `PLANNED != IMPLEMENTED != TESTED != MERGED != DEPLOYED != PRODUCTION VERIFIED`.

Final accepted SHA must be re-fixed after this documentation PR is merged and its post-merge Production Readiness succeeds.

## 2. Canonical hotel data

Live SQL verification on connected `ak-bermet-dev` confirms:

- room units: 169;
- official beds: 407;
- maximum capacity: 484;
- Auth users: 17;
- active role assignments: 17;
- bookings: 0;
- leads: 0;
- approved/live migration count: 37;
- Sheets queue: 169 success.

Staff role distribution:

- owner: 1;
- administrator: 1;
- manager: 4;
- housekeeping: 6;
- technician: 5.

Active inventory distribution:

- Corpus 1 — 24 units / 55 official beds;
- Corpus 2 — 56 / 112;
- Corpus 3 — 40 / 100;
- Garden 1 — 16 / 32;
- Garden 2 — 16 / 32;
- Brick Cottage — 3 / 6;
- Log House — 14 / 70.

Historical `Corpus 4` remains only as a soft-deleted row (`deleted_at` set 2026-08-12) and has no active room units in the V6 inventory.

Commercial/legal core:

- prepayment: 20%;
- check-in: 13:00;
- check-out: 11:00;
- cancellation >=7 days: refund may be possible subject to applicable fee/admin procedure;
- cancellation <7 days: non-refundable;
- no-show: non-refundable.

Pricing remains fail-closed where the authoritative mapping is unresolved. No tariff may be invented.

## 3. Implemented and CI-tested core

Current `main` contains and verifies:

- RU / KG / EN / KZ public localization;
- verified room master and public room catalog;
- Supabase-authoritative availability;
- 60-minute durable holds and overlap protection;
- durable leads and AI-chat CRM handoff;
- real-AI fail-closed provider mode;
- manual booking transaction;
- SUPER Chessboard V2;
- booking services;
- manual payment ledger and audited void;
- manager live-data and analytics;
- guarded site CMS;
- Supabase Auth / RBAC / RLS;
- housekeeping lifecycle;
- technician / maintenance lifecycle;
- inspections and blocking controls;
- Sheets outbox/worker;
- legacy-booking import guard;
- production preflight and fail-closed cutover gate;
- full dependency security audit;
- production Next.js build;
- standalone production HTTP smoke;
- production Docker build;
- disposable DB restore drill with migration replay + data restore + invariant validation.

## 4. Supabase security state

Positive evidence:

- public application tables are RLS-enabled;
- anonymous EXECUTE is denied for audited privileged RPCs;
- staff SECURITY DEFINER RPCs intentionally expose EXECUTE to `authenticated` and enforce hotel roles internally;
- internal helpers are constrained by repository security contracts;
- security-definer search paths are pinned by migrations/contracts.

Open auth hardening item:

- Supabase Leaked Password Protection is currently disabled according to the live security advisor.

Therefore `AK_BERMET_AUTH_HARDENING_VERIFIED` must remain unset until this feature is enabled and role/auth smoke is repeated.

Performance advisor currently reports many `unused_index` INFO notices. Because the connected database has almost no booking/lead/operational workload, these statistics are not sufficient evidence to remove indexes. No index is to be dropped based only on these notices.

## 5. GitHub state

- Current branch inspection: `main` SHA `02fa3ac...`.
- Production Readiness on that SHA: PASS.
- `main` still reports `protected: false`.
- required status checks enforcement is off.

Therefore `AK_BERMET_MAIN_PROTECTION_VERIFIED` must remain unset until protection/rules are enabled and verified.

## 6. Vercel state

Project: `ak-bermet-functional-preview-v2-20260829`.

Project-level configuration inspected on 2026-09-08 reports:

- framework: Next.js;
- configured Node version: `24.x`.

This conflicts with the repository/runtime contract `engines.node = 22.x` and the release CI baseline on Node 22. The final production environment must be aligned to the accepted Node 22 contract or explicitly revalidated under a deliberately changed runtime before cutover. No silent runtime drift is acceptable.

Latest production deployment inspected on 2026-09-08:

- deployment: `dpl_2gK4i8pRPMgMwdcTUrcNuWK5FAK8`;
- state: READY;
- target: production;
- build source SHA: `e0407c32680929ff722ac1ee25816834dbc33a6c`;
- source commit: merge PR #61;
- build detected Next.js `15.5.21`.

This deployment is **not the accepted final release** because current `main` is newer (`02fa3ac...` before this docs PR), is on Next `15.5.25`, and includes dependency-security repairs absent from the old Vercel build.

Final Vercel production must align the runtime contract, deploy the exact accepted post-docs `main` SHA, and pass browser/runtime verification before the deployment gate is considered complete.

## 7. External cutover gates — fail closed

`npm run preflight:cutover` requires all nine external attestations to be exact `YES` with evidence:

1. `AK_BERMET_CUTOVER_APPROVED`
2. `AK_BERMET_LIVE_BACKUP_VERIFIED`
3. `AK_BERMET_PRICING_GAPS_RESOLVED`
4. `AK_BERMET_LEGACY_BOOKINGS_RECONCILED`
5. `AK_BERMET_COTTAGES_READINESS_CONFIRMED`
6. `AK_BERMET_SHEETS_RUNTIME_VERIFIED`
7. `AK_BERMET_BROWSER_UAT_PASSED`
8. `AK_BERMET_AUTH_HARDENING_VERIFIED`
9. `AK_BERMET_MAIN_PROTECTION_VERIFIED`

No gate may be marked PASS by assumption.

## 8. Current blockers

- Enable and verify GitHub `main` protection / required checks.
- Enable Supabase Leaked Password Protection and repeat staff/auth denial tests.
- Obtain the current real reservation register from reception/admin.
- Validate/import/reconcile reservations with zero duplicate/overlap defects before public availability is exposed.
- Resolve or explicitly accept the remaining fail-closed pricing mappings using authoritative hotel data.
- Confirm factual cottage operational readiness.
- Make a fresh live database backup immediately before production data cutover and verify its restore path/hash evidence.
- Verify scheduled Sheets Mirror credentials/run in the final production environment, despite the current 169 successful queue records.
- Align Vercel project runtime from the currently reported Node `24.x` to the repository Node `22.x` contract, or deliberately revalidate a changed contract before release.
- Deploy exact final `main` SHA to Vercel production.
- Perform real desktop/mobile browser UAT on the externally accessible deployment.
- Run final owner/admin/manager/housekeeping/technician role UAT including forbidden-access checks.
- Run booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY E2E.
- Run WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff E2E.
- Switch `akbermet.kg` only after evidence-backed gates and rollback readiness.

## 9. Safe cutover order

1. Freeze feature work.
2. Merge only evidence-backed release/handover fixes.
3. Confirm final `main` SHA + post-merge Production Readiness PASS.
4. Enable/verify `main` protection.
5. Resolve the current-bookings import/reconciliation gate.
6. Resolve pricing and cottage factual gates.
7. Enable Supabase leaked-password protection; rerun auth/role smoke.
8. Verify final Sheets runtime.
9. Create fresh live DB backup and verify restore evidence.
10. Align Vercel runtime contract and deploy exact final SHA to production.
11. Run public browser/mobile/localization/API smoke with no stale claims or 5xx.
12. Run all staff-role UAT and denied-access tests.
13. Run booking/payment/operations end to end.
14. Run WhatsApp/n8n/AI/handoff end to end.
15. Run `npm run preflight:cutover` with all evidence-backed attestations.
16. Switch `akbermet.kg` with rollback target preserved.
17. Verify HTTPS, canonical host, www/non-www, robots, sitemap and runtime logs.
18. Train staff and record owner acceptance.
19. Capture final SHA, final backup, final checklist and handover evidence.

## 10. Handover acceptance

The project is only `FULLY HANDED OVER` when:

- the public domain serves the exact accepted release;
- current reservations are present and reconciled;
- public availability is correct;
- all staff roles work and unauthorized access is denied;
- booking, payment and room operations work end to end;
- backup/restore evidence exists;
- Sheets mirror/scheduler is green;
- WhatsApp/n8n/AI/human-handoff E2E is green;
- browser/mobile/localization UAT is green;
- staff training is complete;
- owner acceptance is recorded.

## 11. Rollback principle

Do not destroy or overwrite the previous public target as part of cutover. Preserve the prior deployment/DNS target and fresh database backup until post-cutover checks are green and the owner accepts the release.
