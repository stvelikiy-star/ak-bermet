# AK BERMET — FINAL HANDOVER RELEASE

Дата фиксации: 2026-09-08 (Asia/Bishkek)

Этот файл — текущая точка входа для финальной сдачи AK BERMET. Старые Stage/TODO/README и `HANDOVER_RELEASE_2026-09-07.md` являются историческими снимками, а не текущим release status.

## 1. Release source of truth

- Repository: `stvelikiy-star/ak-bermet`.
- Default branch: `main`.
- Current pre-auth-hardening baseline: `3e6b8b0ead4da18a87be10040e180bac610b9aea`.
- PR #68: release/security hardening merged.
- PR #69: Actions/lint/dependency-audit modernization merged.
- PR #70: current handover/source-of-truth documentation merged.
- Runtime contract: Node.js `22.x`.
- Application stack: Next.js `15.5.25`, TypeScript, Tailwind CSS.
- Transactional source of truth: Supabase/PostgreSQL.
- Google Sheets: reporting/export mirror only; never the public availability authority.

Release rule: `PLANNED != IMPLEMENTED != TESTED != MERGED != DEPLOYED != PRODUCTION VERIFIED`.

The final accepted SHA must be fixed only after the last release/hardening PR is merged and that exact `main` SHA passes post-merge Production Readiness.

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

Pricing remains fail-closed where an authoritative room-to-price mapping is unresolved. No tariff may be invented.

## 3. Implemented and CI-tested core

Current release contains and verifies:

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
- production + full dependency security audit;
- ESLint zero-warning gate and TypeScript typecheck;
- production Next.js build;
- standalone production HTTP smoke;
- production Docker build;
- disposable DB restore drill with migration replay + data restore + invariant validation.

## 4. Supabase/Auth security state

Positive live/repository evidence:

- public application tables are RLS-enabled;
- anonymous EXECUTE is denied for audited privileged RPCs;
- staff SECURITY DEFINER RPCs expose EXECUTE to `authenticated` only where the function itself checks hotel roles;
- internal helpers are constrained by repository security contracts;
- SECURITY DEFINER search paths are pinned by migrations/contracts;
- the staff provisioner is pinned to the exact DEV project and requires explicit execute gates;
- credential manifests must be private owner files and credentials are never logged;
- staff password manifests require unique passwords of 14–256 characters and reject slot/email-derived predictable passwords;
- the current auth-hardening PR additionally requires uppercase + lowercase + digit + symbol and rejects whitespace/control characters.

Supabase live advisor reports Leaked Password Protection disabled. Current Supabase organization plan is `free`, and current Supabase documentation states leaked-password/HIBP protection is available on Pro Plan and above. Therefore a paid plan upgrade is **not** a mandatory AK BERMET release dependency.

For the current Free plan, `AK_BERMET_AUTH_HARDENING_VERIFIED` may be set only after:

1. the repository password-policy hardening is merged and CI-green;
2. the 17 existing staff accounts/role bindings remain intact;
3. real-session role UAT is repeated for owner/administrator/manager/housekeeping/technician;
4. denied-access checks prove cross-role and unauthorized access is blocked.

Leaked Password Protection should be enabled later if the Supabase organization is upgraded to Pro or higher; it is defense in depth, not a reason to fabricate a failed release on the Free plan.

Performance advisor currently reports many `unused_index` INFO notices. Because the operational workload is nearly empty, this is not sufficient evidence to remove indexes. No index is to be dropped based only on those notices.

## 5. GitHub state

- `main` protection has repeatedly reported `protected: false`.
- required status-check enforcement is off.
- the connected GitHub integration exposes protection/ruleset reads but no administrative write action for enabling it.

Therefore `AK_BERMET_MAIN_PROTECTION_VERIFIED` must remain unset until protection/required checks are enabled through an authorized GitHub administration path and then re-read as enabled.

## 6. Vercel state

Project: `ak-bermet-functional-preview-v2-20260829`.

Project-level configuration inspected on 2026-09-08 reports:

- framework: Next.js;
- configured Node version: `24.x`.

This conflicts with the repository/runtime contract `engines.node = 22.x` and release CI on Node 22. Final production must align to Node 22 or intentionally change the runtime contract and fully revalidate it before cutover.

Latest inspected production deployment:

- deployment: `dpl_2gK4i8pRPMgMwdcTUrcNuWK5FAK8`;
- state: READY;
- target: production;
- build source SHA: `e0407c32680929ff722ac1ee25816834dbc33a6c`;
- source commit: merge PR #61;
- build detected Next.js `15.5.21`.

This deployment is **not** the accepted final release because current `main` is newer, uses Next.js `15.5.25`, and contains security/dependency hardening absent from the old build. The protected/share-token access path also means final anonymous browser UAT is not yet proven.

Final Vercel production must align the runtime contract, deploy the exact accepted final `main` SHA, and pass public browser/runtime verification.

## 7. Booking/Sheets evidence

Live Google Sheets cutover snapshot verification on 2026-09-08 shows:

- `23_Импорт_Брони` contains only the staging notice and headers;
- `Бронирования` contains only headers;
- Supabase `bookings` count is 0.

A search of recently modified accessible AK BERMET Sheets did not reveal a newer working booking register. Therefore `AK_BERMET_LEGACY_BOOKINGS_RECONCILED` must remain unset until reception/admin supplies the real current reservation register and it is validated/imported/reconciled. No synthetic booking rows may be created to make this gate pass.

## 8. External cutover gates — fail closed

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

## 9. Current blockers

- Merge/test the current Free-plan staff password-policy hardening and repeat real role/denial UAT.
- Enable and verify GitHub `main` protection / required checks through an authorized admin path.
- Obtain the real current reservation register from reception/admin and reconcile/import it with zero duplicates/overlaps.
- Resolve or explicitly accept remaining fail-closed pricing mappings from authoritative hotel data.
- Confirm factual cottage operational readiness.
- Verify scheduled Sheets Mirror credentials/run in the final production environment.
- Create a fresh live database backup immediately before production data cutover and verify hash/restore evidence.
- Align Vercel runtime from the currently reported Node `24.x` to the Node `22.x` release contract, or deliberately revalidate a changed runtime contract.
- Deploy the exact final `main` SHA to Vercel production.
- Make the final deployment externally accessible for anonymous browser UAT.
- Run desktop/mobile RU/KG/EN/KZ browser UAT and no-5xx/API smoke.
- Run final owner/admin/manager/housekeeping/technician UAT including forbidden-access checks.
- Run booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY E2E.
- Run WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff E2E.
- Switch `akbermet.kg` only after evidence-backed gates and rollback readiness.

Optional paid hardening, not a blocker on the current Free plan:

- Supabase Pro+ Leaked Password Protection / HIBP.

## 10. Safe cutover order

1. Freeze feature work.
2. Merge only evidence-backed release/hardening changes.
3. Confirm exact final `main` SHA + post-merge Production Readiness PASS.
4. Enable/verify `main` protection.
5. Finish staff auth/role/denial UAT.
6. Resolve current-bookings import/reconciliation.
7. Resolve pricing and cottage factual gates.
8. Verify final Sheets runtime.
9. Create fresh live DB backup and verify restore evidence.
10. Align Vercel runtime and deploy exact final SHA.
11. Run public browser/mobile/localization/API smoke.
12. Run all staff-role UAT and denied-access tests.
13. Run booking/payment/operations end to end.
14. Run WhatsApp/n8n/AI/handoff end to end.
15. Run `npm run preflight:cutover` with all evidence-backed attestations.
16. Switch `akbermet.kg` with rollback target preserved.
17. Verify HTTPS, canonical host, www/non-www, robots, sitemap and runtime logs.
18. Train staff and record owner acceptance.
19. Capture final SHA, final backup, final checklist and handover evidence.

## 11. Handover acceptance

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

## 12. Rollback principle

Do not destroy or overwrite the previous public target as part of cutover. Preserve the prior deployment/DNS target and fresh database backup until post-cutover checks are green and the owner accepts the release.
