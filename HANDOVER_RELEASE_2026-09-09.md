# AK BERMET — FINAL HANDOVER RELEASE

Дата актуализации: 2026-09-10 (Asia/Bishkek)

Этот файл — текущая точка входа для финальной сдачи AK BERMET. `HANDOVER_RELEASE_2026-09-08.md` и более старые Stage/TODO документы — исторические снимки.

## 1. Release source of truth

- Repository: `stvelikiy-star/ak-bermet`.
- Default branch: `main`.
- Accepted functional code baseline: `563c79b5a78410918aaff96d85e4aa9b87d96b0a`.
- Current `main` tip: `1f8e1e923992945170a34e798664b01b67b57ef0` (documentation refresh on top of the accepted functional baseline).
- PR #76 merged: strict ready-only internal booking placement.
- Production Readiness #236 for exact functional baseline `563c79b...`: PASS through dependency audits, lint, typecheck, all critical contracts, production build, HTTP smoke and Docker build.
- Runtime contract: Node.js `22.x`.
- Application stack: Next.js `15.5.25`, TypeScript, Tailwind CSS.
- Transactional source of truth: Supabase/PostgreSQL.
- Google Sheets: reporting/export mirror only; never public availability authority.

Release rule: `PLANNED != IMPLEMENTED != TESTED != MERGED != DEPLOYED != PRODUCTION VERIFIED`.

## 2. Approved migration state

Repository approved ordered migration ledger:

- 38 migrations;
- newest approved migration: `20260909050000_enforce_ready_for_manual_booking_and_move.sql`.

Disposable Restore Drill #18 replayed the approved chain on disposable Supabase and passed application-data backup/restore plus critical DB invariants.

Live AK BERMET database remains deliberately behind by one migration until a recoverable production backup exists:

- live migration count: 37;
- live latest migration: `20260830083140`;
- pending live apply: `20260909050000_enforce_ready_for_manual_booking_and_move.sql`.

Do **not** apply migration 38 without fresh backup evidence.

## 3. Live Supabase state

Connected AK BERMET project:

- project: `ak-bermet-dev`;
- ref: `ednqgzgjhnalsiiuekmw`;
- status: `ACTIVE_HEALTHY`;
- Postgres: 17;
- organization plan: Free.

No separate active AK BERMET production Supabase project exists in the connected organization. This project is therefore the current live AK BERMET database target unless a separate production project is explicitly provisioned later.

Latest verified inventory/runtime snapshot:

- room units: 169;
- official beds: 407;
- maximum capacity: 484;
- `active + ready`: 137;
- non-sellable / blocked: 32;
- active bookings: 0;
- live unexpired availability holds: 0.

The 32 unresolved units remain fail-closed and must not be activated by assumption.

## 4. Ready-only booking integrity fix

Live audit found that public availability and durable holds required `operational_status='ready'`, but two internal RPCs were weaker:

- `fn_create_manual_booking`;
- `fn_move_booking_room`.

PR #76 added migration `20260909050000_enforce_ready_for_manual_booking_and_move.sql` so both RPCs require a strict ready target before booking or moving a booking room.

Evidence:

- targeted ready-only regression contract: PASS;
- Production Readiness #233 on PR head: PASS;
- Disposable Restore Drill #18: PASS;
- PR #76 merged;
- Production Readiness #236 on accepted functional baseline `563c79b...`: PASS.

Live database verification currently still reports both functions as `ready-only = false`, which is expected because migration 38 has not been applied. The live apply is blocked only by the fresh-backup gate.

## 5. Inventory / pricing policy

Current release inventory supports a safe partial launch of 137 verified rooms while unresolved inventory stays unavailable.

Blocked inventory remains tied to unresolved factual data:

- 17 cottage units require readiness/owner decision;
- 15 Corpus 3 units remain blocked due pricing/source-label gaps.

No price, capacity or readiness state may be invented.

Valid release choices:

1. obtain authoritative data and activate verified units; or
2. explicitly approve launch with unresolved units remaining blocked/inactive.

## 6. Auth / RBAC / RLS state

Previously verified live staff/auth integrity:

- 17 Auth users;
- 17 profiles;
- 17 unique active role assignments;
- role distribution: 1 owner / 1 administrator / 4 manager / 6 housekeeping / 5 technician;
- anonymous EXECUTE on audited staff SECURITY DEFINER RPCs: 0.

Staff password tooling enforces a strict local policy and private credential handling.

Supabase Leaked Password Protection / HIBP is not enabled because the connected organization is on Free plan. It is optional Pro+ defense in depth and is **not** a required blocker for the current release.

`AK_BERMET_AUTH_HARDENING_VERIFIED` still requires final real-session role UAT and denied-access checks on the accepted deployment.

## 7. Backup state — blocking

Repository backup tooling is CI-tested for:

- operator approval;
- read-only `pg_dump`;
- TLS/read-only connection safety;
- private destination handling;
- checksum validation;
- `pg_restore --list` archive validation;
- no secret logging.

However, a fresh live database backup does **not** currently exist in the available evidence.

Verified reasons:

- Supabase organization plan is Free; automatic database backup/PITR is unavailable for this project;
- connected Supabase tools expose no dump/export action;
- Supabase development branches do not copy production data and are not a backup substitute;
- strict Google Drive search found no fresh AK BERMET backup evidence for 2026-09-09;
- GitHub release-secret preflight checked presence only and found no `AK_BERMET_DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` or backup-encryption secret available to Actions.

Therefore:

- `AK_BERMET_LIVE_BACKUP_VERIFIED` remains false;
- migration 38 must remain unapplied;
- database cutover must remain blocked.

## 8. GitHub state — blocking admin gate

Current `main`:

- SHA: `1f8e1e923992945170a34e798664b01b67b57ef0` (documentation tip; functional baseline `563c79b...`);
- Production Readiness #236 for the functional baseline: PASS;
- branch protection: `protected: false`;
- required status checks enforcement: off.

The connected GitHub App can read this state and write normal repository content/PRs, but it does not expose branch-protection administration write access.

`AK_BERMET_MAIN_PROTECTION_VERIFIED` must remain false until an admin-capable GitHub path enables protection and the branch is re-read as protected.

## 9. Vercel state — stale production artifact

Vercel project:

- project id: `prj_b3kaGYbW8gVtJg4o5PlP6K4kxaIV`;
- name: `ak-bermet-functional-preview-v2-20260829`;
- framework: Next.js.

Latest inspected production deployment:

- deployment: `dpl_Fy9PqcRA4SXZwigdXjr2wuzBo38e`;
- state: READY;
- target: production;
- build detected Next.js `15.5.25`;
- build bootstrap fetched source SHA `0d9feabeb42a29052ee2246633afff3c8ff79963`.

This deployment is stale relative to current `main 1f8e1e9` and accepted functional baseline `563c79b...`; it is not the final release artifact.

Recent Vercel runtime scan found no runtime error clusters in the checked interval, but that does not convert the stale deployment into accepted production evidence.

Project settings currently display Node `24.x`; repository `package.json` pins `engines.node = 22.x`. Final exact-SHA build must confirm the release runtime contract.

GitHub Actions currently has no `VERCEL_TOKEN`, and the connected Vercel tool does not expose a targeted source-ref deployment/write-project-settings action. Do not fake or infer an exact-SHA deploy.

## 10. Browser UAT state

Vercel deployment protection currently returns SSO redirects during external fetches. A generated share bypass still did not produce a complete anonymous nested-route session in the available test client.

Therefore:

- `AK_BERMET_BROWSER_UAT_PASSED` remains false;
- Vercel SSO redirects must not be misclassified as application 5xx failures;
- final anonymous desktop/mobile RU/KG/EN/KZ UAT must run on the exact accepted deployment.

## 11. Sheets Mirror state

Historical worker path is proven:

- 169 room queue rows processed successfully;
- 169 corresponding history rows recorded on 2026-08-30.

Post-fix scheduled runtime is now confirmed:

- Sheets Mirror #80 — source SHA `1f8e1e9`, `completed/success`;
- Sheets Mirror #81 — source SHA `1f8e1e9`, `completed/success`;
- both are scheduled runs after the scheduler safety fix.

`AK_BERMET_SHEETS_RUNTIME_VERIFIED` is now supported by current Actions evidence and is no longer a release blocker.

## 12. Reservation state

Latest live Supabase check reports active bookings = 0. Existing booking-import surfaces also had no real active booking rows in prior verification.

This is not sufficient by itself to declare the hotel has no real future reservations outside the system.

Valid evidence for `AK_BERMET_LEGACY_BOOKINGS_RECONCILED` is either:

1. current authoritative reception/admin reservation register imported and reconciled; or
2. authoritative owner/reception confirmation that there are no active reservations to migrate.

Never create synthetic bookings to satisfy this gate.

## 13. Public domain state

Available web evidence on 2026-09-10 still shows `akbermet.kg` serving the legacy site. No verified domain cutover to the new Next.js release has occurred.

Do not switch the domain until all cutover gates, exact-SHA deployment, backup and rollback readiness are satisfied.

## 14. Cutover attestations — fail closed

`npm run preflight:cutover` requires exact `YES` for:

1. `AK_BERMET_CUTOVER_APPROVED`
2. `AK_BERMET_LIVE_BACKUP_VERIFIED`
3. `AK_BERMET_PRICING_GAPS_RESOLVED`
4. `AK_BERMET_LEGACY_BOOKINGS_RECONCILED`
5. `AK_BERMET_COTTAGES_READINESS_CONFIRMED`
6. `AK_BERMET_SHEETS_RUNTIME_VERIFIED`
7. `AK_BERMET_BROWSER_UAT_PASSED`
8. `AK_BERMET_AUTH_HARDENING_VERIFIED`
9. `AK_BERMET_MAIN_PROTECTION_VERIFIED`

No gate may be set to `YES` without evidence.

## 15. Safe remaining sequence

1. Keep feature work frozen except release-critical fixes.
2. Enable and verify GitHub `main` protection / required Production Readiness check.
3. Obtain authoritative reservation evidence.
4. Record owner decision for the 32 blocked units / 137-room safe launch policy.
5. Sheets Mirror post-fix PASS is already recorded in runs #80/#81.
6. Create fresh live `pg_dump`, checksum it and validate restore/archive evidence.
7. Apply approved migration `20260909050000_enforce_ready_for_manual_booking_and_move.sql` to live Supabase.
8. Re-verify live migration ledger = 38, ready-only RPC definitions, inventory counts, bookings/holds and Supabase advisors.
9. Deploy exact accepted `main` SHA (or a later explicitly accepted GREEN SHA) to Vercel.
10. Verify source SHA, build/runtime contract and runtime errors.
11. Run anonymous desktop/mobile RU/KG/EN/KZ browser/API UAT.
12. Run real-session owner/admin/manager/housekeeping/technician + denied-access UAT.
13. Run booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY E2E.
14. Run WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff E2E.
15. Run `npm run preflight:cutover` with evidence-backed attestations only.
16. Switch `akbermet.kg` while preserving the previous rollback target.
17. Verify HTTPS/canonical/www/robots/sitemap/runtime logs after cutover.
18. Train staff and record owner acceptance.
19. Capture final code SHA, final DB backup hash and final handover checklist.

## 16. Handover acceptance

The project is `FULLY HANDED OVER` only when:

- public domain serves the exact accepted release;
- fresh backup/restore evidence exists;
- live migration ledger matches approved release state;
- current reservations are reconciled or authoritatively confirmed absent;
- public availability exposes only approved inventory;
- all staff roles work and unauthorized access is denied;
- booking, payment and room operations work end to end;
- Sheets scheduler is green;
- WhatsApp/n8n/AI/human-handoff E2E is green;
- browser/mobile/localization UAT is green;
- staff training is complete;
- owner acceptance is recorded.

## 17. Rollback principle

Do not destroy or overwrite the previous public target during cutover. Preserve the previous deployment/DNS target and the fresh database backup until post-cutover checks are green and the owner accepts the release.
