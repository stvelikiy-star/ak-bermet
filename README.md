# AK BERMET — SPA & WELLNESS

Unified hotel website + PMS/CRM/operations platform for AK BERMET.

## Current release architecture

- Next.js `15.5.25` (App Router) + TypeScript + Tailwind CSS.
- Node.js `22.x` runtime contract.
- Supabase/PostgreSQL is the transactional source of truth.
- Google Sheets is a reporting/integration mirror only and is **not** the authority for public availability.
- Supabase Auth + RBAC + RLS protect staff access.
- Public website supports RU / KG / EN / KZ.
- Manager CRM includes leads, availability, rooms, bookings/chessboard, payments, reports and CMS.
- Operations include housekeeping, maintenance/technician tasks, inspections and room readiness states.
- AI chat is fail-closed in production and may hand off a durable lead to CRM; it is not booking/payment authority.

## Canonical hotel data

Current reconciled 2026 room master:

- 169 room/object units.
- 407 official beds.
- 484 maximum capacity after confirmed extra-place semantics.
- Active inventory groups: Corpus 1, Corpus 2, Corpus 3, Garden 1, Garden 2, Brick Cottage, Log House.
- Historical `Corpus 4` is soft-deleted and is not part of the active V6 inventory.

Commercial/legal core:

- Prepayment: 20%.
- Check-in: 13:00.
- Check-out: 11:00.
- Cancellation: >=7 days — refund may be possible subject to applicable fee/admin procedure; <7 days — non-refundable; no-show — non-refundable.

## Local development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Production-like local verification:

```bash
npm ci
npm run lint
npx tsc --noEmit --incremental false
npm run build
npm run start
```

## Release gates

The main CI workflow runs:

- production dependency audit;
- full dependency audit including dev dependencies;
- ESLint with zero-warning gate;
- TypeScript typecheck;
- room master / Pricing V6 / legal / availability / leads / AI / Sheets contracts;
- booking / chessboard / payments / CMS contracts;
- ready-only internal booking-placement contract;
- staff auth / housekeeping / technician / inspection contracts;
- production preflight contract;
- production Next.js build;
- standalone production HTTP smoke;
- generated-file hygiene;
- production Docker build.

Disposable Restore Drill independently validates migration replay, application-data backup/restore and critical DB invariants.

## Production cutover

Production cutover is intentionally fail-closed:

```bash
npm run preflight:cutover
```

The command must remain blocked until every external release attestation is backed by evidence. Do not set any gate to `YES` by assumption.

## Current accepted release state

- Current `main` tip: `c535eb8fa4904ce168abb4577b3588f0f1973f9c` (`chore: approve guest QR foreign-key indexes`).
- Production Readiness workflow for this release commit: PASS (run `34614442708`).
- Repository approved migration chain: 40 migrations.
- Live AK BERMET Supabase ledger: 40 migrations; latest live migration is `20260911150916` (Supabase-assigned timestamp for the guest QR foreign-key indexes).
- Live inventory: 169 total / 137 `active + ready` / 32 `inactive + blocked`.
- Current live counts at the latest audit: 1 booking, 0 availability holds, 0 active guest QR tokens, 0 guest service requests, 0 leads.
- Current production deployment: Vercel `dpl_J5RhvHAYZmdn8oBk4FeaE1mCiwzH`, state `READY`, production alias `ak-bermet-functional-preview-v2-202.vercel.app`.
- The custom domain `akbermet.kg` is not attached to this Vercel project; domain cutover remains intentionally separate.

## Current known external blockers

- A live owner/reception reconciliation is still required for the 1 existing booking and for the 32 `inactive + blocked` units. Prices and availability must not be invented.
- Manager, housekeeping and technician journeys have build/smoke evidence, but real authenticated browser UAT with owner-provided accounts is **NOT VERIFIED**.
- No guest QR has been issued yet. QR creation, printing and guest-request handling require a real manager-session UAT before handover.
- Payment gateway, WhatsApp/Telegram automation, Google Sheets mirror, physical lock/TTLock/TTHotel and email/SMS delivery are **UNKNOWN / NOT VERIFIED** for production; credentials and real E2E evidence are not present in the audit sources.
- A fresh recoverable database dump/restore drill is **NOT VERIFIED**. The owner has explicitly accepted this as a release risk; no production backup was claimed or published.
- Supabase security advisor currently reports 28 existing `SECURITY DEFINER` functions executable by authenticated users. These are operational RPCs and were not revoked blindly; each should be reviewed against its role policy before final handover. Performance advisor reports 76 INFO unused-index notices and 6 multiple-permissive-policy notices.
- GitHub branch protection and required checks are **NOT VERIFIED** in the current audit.
- The latest production build is healthy and runtime errors were absent in the last 7 days, but the public custom-domain browser/mobile UAT is **NOT VERIFIED**.

Supabase Leaked Password Protection / HIBP is **optional Pro+ defense in depth**, not a required blocker for the current Free-plan release. The repository enforces a strict staff-password policy as compensating hardening.

## Handover source of truth

Use:

- `HANDOVER_RELEASE_2026-09-09.md` — current handover state and cutover sequence.
- `TODO_NEXT_STAGES.md` — remaining release backlog only.
- `scripts/production-migrations-approved.json` — approved ordered migration ledger.

`HANDOVER_RELEASE_2026-09-08.md`, historical Stage documents and older snapshots remain historical evidence and must not be used as the current release status.

## Safety rules

- Never invent room availability or prices.
- Never treat Google Sheets as transactional availability authority.
- Never expose Supabase service-role or database credentials in client code, CI logs or repository files.
- Never apply production migrations without an approved ledger, fresh recoverable backup and evidence-backed release decision.
- Never cut over `akbermet.kg` without a rollback path and completed evidence-backed gates.
