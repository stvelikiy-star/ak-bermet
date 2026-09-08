# AK BERMET — FINAL HANDOVER RELEASE

Дата фиксации: 2026-09-08 (Asia/Bishkek)

Этот файл — текущая точка входа для финальной сдачи AK BERMET. Старые Stage/TODO и `HANDOVER_RELEASE_2026-09-07.md` — исторические снимки.

## 1. Release source of truth

- Repository: `stvelikiy-star/ak-bermet`.
- Default branch: `main`.
- Current accepted code baseline: `fa8d98536ed18deef109514aae3c0179798c13fe`.
- PR #70 merged: handover/source-of-truth refresh.
- PR #71 merged: Free-plan staff password-policy hardening.
- Post-merge Production Readiness for `fa8d985...`: PASS through full dependency audit, lint, typecheck, all critical contracts, production build, HTTP smoke and Docker build.
- Runtime contract: Node.js `22.x`.
- Application stack: Next.js `15.5.25`, TypeScript, Tailwind CSS.
- Transactional source of truth: Supabase/PostgreSQL.
- Google Sheets: reporting/export mirror only; never public availability authority.

Release rule: `PLANNED != IMPLEMENTED != TESTED != MERGED != DEPLOYED != PRODUCTION VERIFIED`.

## 2. Live Supabase state

Connected AK BERMET project:

- project: `ak-bermet-dev`;
- ref: `ednqgzgjhnalsiiuekmw`;
- status: `ACTIVE_HEALTHY`;
- Postgres: 17;
- live migration ledger: 37 migrations, first `20260721000100`, latest `20260830083140`.

No separate active Supabase project named AK BERMET production exists in the connected organization. Production cutover must therefore explicitly accept this existing AK BERMET project as the live database target or provision a separate production project before data cutover. Do not pretend a separate production database already exists.

Canonical inventory live verification:

- 169 room units;
- 407 official beds;
- 484 max capacity;
- 137 rooms are `ready + active`;
- 32 rooms are `blocked + inactive`.

The 32 blocked units are exactly:

- Brick Cottage: 3;
- Log House: 14;
- Corpus 3: 15.

All 17 cottage units carry explicit staging notes containing `DO_NOT_ACTIVATE` and remain blocked/inactive.

The 15 blocked Corpus 3 units are exactly the unresolved pricing group: 14 Standard rooms plus `AKB-C3-301` with the preserved source label `4-х семейный-3`.

Audit history proves the staging model is deliberate:

- 137 distinct rooms passed `blocked/inactive -> ready/active` activation;
- all 137 remain `ready/active` now;
- the remaining 32 never passed activation.

This means the live database already fails closed on the unverified inventory rather than exposing it for sale.

## 3. Public availability safety

Current production code maps:

- `sellable_status != active` -> `do_not_sell`;
- `operational_status == ready` + active sellable status -> `active`;
- other operational states -> `maintenance`.

`filterRooms()` returns only rooms with application status `active`.

Therefore the 32 blocked/inactive rooms are excluded from public availability even though the server reads the full room table through the service-role client.

Direct raw anonymous access is stricter still: the live `anon` database role has no direct SELECT privilege on `room_units`. Public availability must go through the controlled `/api/availability` route.

A safe partial-inventory launch of the 137 verified active rooms is technically supported. It still requires explicit owner/cutover approval that the 32 unresolved units remain unavailable at launch. No missing price or cottage status may be invented.

## 4. Pricing evidence

Current 2026 mapping coverage remains:

- `PRICED`: 154;
- `UNPRICED_PRIMARY_SOURCE`: 14;
- `UNRESOLVED_SOURCE_LABEL`: 1.

The Google Sheets tariff staging area contains the approved primary 2026 price rows for confirmed categories, but no authoritative tariff exists for Corpus 3 Standard and no explicit mapping exists for `C3-301`.

Two legitimate release choices exist:

1. obtain authoritative price/mapping data and activate those rooms; or
2. explicitly approve launch with those 15 rooms blocked/inactive.

There is no third option that invents a tariff.

## 5. Auth/RBAC/RLS security state

Live verification:

- Auth users: 17;
- active role assignments: 17;
- missing profiles: 0;
- inactive/deleted profiles: 0;
- users without exactly one active role: 0;
- unique emails: 17/17;
- unique `staff_slot`: 17/17;
- unconfirmed emails: 0.

Role distribution:

- owner: 1;
- administrator: 1;
- manager: 4;
- housekeeping: 6;
- technician: 5.

SECURITY DEFINER live audit:

- public SECURITY DEFINER functions: 44;
- executable by `anon`: 0;
- executable by `authenticated`: 28.

The 28 authenticated RPCs are the intentionally role-guarded staff operations covered by repository security contracts. Supabase advisor therefore reports them as WARN by design; anonymous EXECUTE remains zero.

PR #71 password policy is merged and CI-green. Staff credential manifests now require:

- 14–256 characters;
- unique passwords;
- anti-predictability against slot/email local-part;
- uppercase;
- lowercase;
- digit;
- symbol;
- no whitespace/control characters;
- secure private manifest file;
- no credential logging.

Supabase Leaked Password Protection is disabled, but the connected organization is on Free and current Supabase documentation states HIBP/leaked-password protection is Pro+. It is optional defense in depth, not a required paid dependency for this release.

`AK_BERMET_AUTH_HARDENING_VERIFIED` still requires a final real-session role UAT and denied-access test on the release deployment.

## 6. GitHub state

Current `main`:

- SHA: `fa8d98536ed18deef109514aae3c0179798c13fe`;
- post-merge Production Readiness: PASS;
- branch protection: `protected: false`;
- required status checks enforcement: off.

The connected GitHub integration supports branch-protection reads but exposes no administrative write operation. Therefore `AK_BERMET_MAIN_PROTECTION_VERIFIED` remains blocked until an authorized GitHub admin path enables protection/required checks and the branch is re-read as protected.

## 7. Vercel state

Project: `ak-bermet-functional-preview-v2-20260829`.

Latest inspected production deployment remains:

- deployment: `dpl_2gK4i8pRPMgMwdcTUrcNuWK5FAK8`;
- state: READY;
- target: production;
- source SHA: `e0407c32680929ff722ac1ee25816834dbc33a6c`;
- Next.js detected: `15.5.21`.

This is stale and is not the accepted release.

No new Vercel deployment was created after 2026-09-08 00:00 UTC despite merges to `main`, so the current Git/Vercel deployment path is not automatically promoting the accepted SHA.

Project settings report Node `24.x`, but this is **not a blocker**: current Vercel documentation states `package.json -> engines.node` overrides the project Node version, and the release package fixes `engines.node` to `22.x`.

The actual Vercel blockers are:

- deploy exact accepted SHA `fa8d985...` or a later explicitly accepted SHA;
- verify that build output uses the current Next.js/dependency set;
- make the final deployment accessible for anonymous browser UAT;
- run runtime/no-5xx verification.

## 8. Booking and Sheets evidence

Current reservation evidence:

- Supabase bookings: 0;
- Supabase leads: 0;
- Google Sheets `23_Импорт_Брони`: headers only;
- Google Sheets `Бронирования`: headers only.

No synthetic booking rows may be created to pass the cutover gate. Reception/admin must supply the actual current reservation register, or explicitly confirm there are no active reservations to migrate.

Sheets Mirror evidence:

- 169 `Номера` queue rows processed successfully;
- 169 matching history rows exist;
- actual processing occurred on 2026-08-30.

This proves the worker path worked end to end in the past. It does **not** prove the final scheduled production runtime is configured and executing today. `AK_BERMET_SHEETS_RUNTIME_VERIFIED` remains open until the final scheduler/credentials are checked in the release environment.

## 9. Backup state

Repository backup tooling is release-grade and CI-tested:

- operator-approved read-only `pg_dump`;
- TLS required;
- read-only transaction enforcement;
- Docker isolation;
- checksum generation/verification;
- `pg_restore --list` archive validation;
- private backup permissions;
- no secret logging.

A fresh live backup has **not** been executed in this session because the required database password/connection secret and operator Docker runtime are intentionally not exposed through the connected cloud tools. `AK_BERMET_LIVE_BACKUP_VERIFIED` must remain unset until the approved backup command is run and its hash/restore evidence is recorded.

## 10. External cutover gates — fail closed

`npm run preflight:cutover` still requires exact `YES` for:

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

For pricing/cottages, a valid evidence-backed owner decision may be either full activation with authoritative data or launch with the affected units explicitly remaining blocked/inactive. That policy must be recorded before the corresponding gate is set.

## 11. Current blockers

- Enable and verify GitHub `main` protection / required checks.
- Obtain the current real reservation register, or explicit authoritative confirmation that there are no active reservations to migrate.
- Obtain owner acceptance for the 32-unit blocked launch policy, or authoritative data required to activate those rooms.
- Verify final scheduled Sheets Mirror runtime/credentials.
- Run a fresh live DB backup and record checksum/restore evidence.
- Deploy the exact accepted SHA to Vercel production.
- Run anonymous desktop/mobile RU/KG/EN/KZ browser UAT and no-5xx/API smoke.
- Run real-session owner/admin/manager/housekeeping/technician role UAT and denied-access checks.
- Run booking -> payment -> check-in -> checkout -> cleaning -> maintenance/inspection -> READY E2E.
- Run WhatsApp -> webhook -> n8n -> AI -> durable CRM lead -> manager notification -> human handoff E2E.
- Switch `akbermet.kg` only after all evidence-backed gates and rollback readiness.

Optional paid hardening:

- Supabase Pro+ Leaked Password Protection / HIBP.

## 12. Safe cutover order

1. Freeze feature work.
2. Keep accepted code on CI-green `main`.
3. Enable/verify `main` protection.
4. Record owner decision for current reservations and 32 blocked units.
5. Verify final Sheets scheduler/runtime.
6. Run fresh live DB backup and validate checksum/archive.
7. Deploy exact accepted SHA to Vercel production.
8. Run anonymous browser/mobile/localization/API smoke.
9. Run real-session staff role and denied-access UAT.
10. Run booking/payment/operations E2E.
11. Run WhatsApp/n8n/AI/handoff E2E.
12. Run `npm run preflight:cutover` with evidence-backed attestations only.
13. Switch `akbermet.kg` while preserving rollback target.
14. Verify HTTPS/canonical/www/robots/sitemap/runtime logs.
15. Train staff and record owner acceptance.
16. Capture final SHA, final backup, final checklist and handover evidence.

## 13. Handover acceptance

The project is `FULLY HANDED OVER` only when:

- public domain serves the exact accepted release;
- current reservations are reconciled or authoritatively confirmed absent;
- public availability exposes only approved inventory;
- all staff roles work and unauthorized access is denied;
- booking, payment and room operations work end to end;
- backup/restore evidence exists;
- Sheets scheduler is green;
- WhatsApp/n8n/AI/human-handoff E2E is green;
- browser/mobile/localization UAT is green;
- staff training is complete;
- owner acceptance is recorded.

## 14. Rollback principle

Do not destroy or overwrite the previous public target during cutover. Preserve the prior deployment/DNS target and the fresh database backup until post-cutover checks are green and the owner accepts the release.
