# AK BERMET — Issue #2 QA Readiness

Date: 2026-08-13 (+06:00)
Status: TECHNICAL AUDIT UPDATED / PRODUCTION UNCHANGED

This document reconciles GitHub `main`, the connected Supabase development project, the authoritative Google Drive photo folders, and the AK BERMET working spreadsheet. It does not authorize production migration or deployment.

## Verified current state

### GitHub

- Base audited before this repair branch: `main` SHA `586a0db9fe73d65486cb9581b9ca39853309cdc6`.
- Production Readiness on that SHA: PASS, including dependency audit, data/booking contracts, Supabase security contract, production preflight, operations tests, Next.js production build, and Docker build.
- Supabase approved migration chain: 19/19 files; final migration is `20260813035252_security_definer_execute_lockdown.sql`.

### Supabase development

Connected project: `ak-bermet-dev` (`ednqgzgjhnalsiiuekmw`), PostgreSQL 17.

Read-only verification on 2026-08-13:

- migration ledger: 19/19 approved migrations present;
- `auth.users`: 0 rows;
- `public.profiles`: 0 rows;
- active role bindings: 0 for owner, administrator, manager, housekeeping, and technician;
- security hardening from migration 19 is applied and separately verified.

Conclusion: the DEV identity schema is ready, but role UAT with real Auth sessions has not yet happened because no DEV staff identities exist.

### Local staff login contract

- `/staff/login` correctly fails closed when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing.
- `.env.local` is correctly git-ignored; public Supabase configuration must be supplied on the QA machine, not committed.
- Before this branch there was no repeatable local auth preflight.
- This branch adds `npm run preflight:local-auth` plus a secret-safe contract test. The preflight validates only local configuration shape; it performs no network or database writes and never prints configured values.

### Google Drive media

Authoritative project folder: `AK BERMET DIGITAL/03_Photos`.

Verified direct category folders:

- Rooms
- Garden
- Hot Springs
- SPA
- Events
- Food
- Territory
- Logo
- Old Materials

Verified `Rooms` subfolders supplied by the owner include:

- `brick-cottage-1a`
- `brick-cottage-4-bed`
- `building-1-room-301-5-bed`
- `building-1-room-302-2-bed`
- `building-2-room-101-lux-2-bed`
- `building-2-room-104-standard-2-bed`
- `building-2-room-106-junior-suite-4-bed`
- `building-2-room-107-junior-suite-2-bed`
- `log-house-1`
- `wooden-cottage-2-bed`
- `wooden-cottage-4-bed`
- `wooden-cottage-8-bed`

Repository public room pages still intentionally use `/images/rooms/photo-pending.svg` where approved image-to-public-category mapping has not been completed. Drive files/folders must not be renamed to force a mapping.

### Google Sheets integrity

Working spreadsheet: `AK BERMET — Рабочая таблица`.

Read-only verification of reconciliation/cutover sheets shows:

- room inventory: 169 confirmed units — READY;
- official capacity: 407 — READY;
- maximum capacity: 484 — READY;
- tariffs: confirmed tariff staging exists, but 14 standard rooms in Corpus 3 plus room C3-301 remain intentionally unresolved for automatic pricing — PENDING OWNER DATA;
- staff: spreadsheet expects 17 staff identities, but Supabase DEV currently has 0 Auth users/profiles — PENDING IDENTITY QA;
- current bookings: no authoritative current-booking export from the legacy PMS is present — PENDING LEGACY DATA;
- Supabase → Google Sheets one-way mirror: not configured — PENDING INTEGRATION;
- some cutover/evidence rows still reference older PR/run evidence and must not override current GitHub/Supabase facts.

## Issue #2 acceptance matrix

| Area | Current result | Remaining action |
|---|---|---|
| Secure local Supabase public env/preflight | REPAIR IN THIS PR | Run `npm run preflight:local-auth` on the actual QA Ubuntu environment after public DEV values are loaded locally |
| Staff login form | IMPLEMENTED / FAIL-CLOSED | Requires local DEV public env values for runtime verification |
| Owner/admin/manager/housekeeping/technician role matrix | BLOCKED BY DEV IDENTITIES | Create isolated DEV Auth test users through an approved Auth admin flow, bind profiles/roles, then run route/RLS UAT |
| Media inventory | DRIVE ACCESS + FOLDER INVENTORY PASS | Map approved photos to public categories without renaming source assets; keep placeholder where mapping is not authoritative |
| Sheets inventory/capacity integrity | PASS (169 / 407 / 484) | No destructive repair required |
| Sheets staff integrity | PENDING | Populate/approve staff identities before real Auth creation |
| Sheets booking integrity for cutover | PENDING LEGACY SOURCE | Obtain current bookings export from legacy PMS before production cutover |
| Supabase → Sheets mirror | PENDING | Build/test after authoritative DEV datasets and role UAT are ready |
| Production migration/deploy | NOT AUTHORIZED | Separate owner approval after staging/UAT, fresh backup, verified host, and rollback plan |

## Next safe technical order

1. Merge this local-auth preflight repair only after full Production Readiness PASS on its final SHA.
2. Configure the QA Ubuntu `.env.local` with the connected DEV project's public URL/publishable key and run `npm run preflight:local-auth`.
3. Create isolated DEV QA identities only through Supabase Auth admin flow; do not insert directly into `auth.users`.
4. Run role/RLS route matrix for all five role types, including inactive/deleted/removed-role denial.
5. Complete read-only media mapping inventory, then import only confidently mapped approved assets.
6. Reconcile current legacy PMS bookings before any cutover rehearsal.
7. Configure and test one-way Supabase → Sheets mirror only after the authoritative DEV datasets are stable.

Production remains fail-closed.
