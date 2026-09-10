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

- Accepted functional GitHub baseline: `563c79b5a78410918aaff96d85e4aa9b87d96b0a`.
- Current `main` tip is documentation commit `1f8e1e923992945170a34e798664b01b67b57ef0` on top of that baseline.
- Production Readiness #236 for the exact functional baseline: PASS.
- Repository approved migration chain: 38 migrations.
- Live AK BERMET Supabase ledger: 37 migrations; migration `20260909050000_enforce_ready_for_manual_booking_and_move.sql` is intentionally **not yet applied**.
- Live inventory remains 169 total / 137 `active + ready` / 32 non-sellable; current live bookings = 0 and live availability holds = 0 at the latest verification.

## Current known external blockers

- GitHub `main` branch protection / required checks must be enabled and then re-verified. Current branch state is `protected: false`.
- A fresh recoverable live database backup must be created immediately before applying the pending 38th migration or performing production data cutover.
- The connected Supabase organization is on Free plan; automatic database backup/PITR is not available for this project, so the backup gate requires an explicit dump/checksum/restore-verification path.
- Current real hotel reservations must be obtained and reconciled, or an authoritative owner/reception confirmation must state that there are no active reservations to migrate.
- Remaining pricing gaps and cottage readiness require authoritative owner decisions. Unverified units must stay blocked/inactive; prices must never be invented.
- Sheets Mirror post-fix is confirmed by scheduled runs #80 and #81 (`completed/success`) on the current `main` tip.
- The exact current release SHA still must be deployed to Vercel production and pass anonymous browser/mobile UAT; the latest inspected Vercel production deployment was built from an older SHA.
- Supabase security advisor reports leaked-password protection disabled; on the current Free plan this is defense-in-depth, but it should be enabled when the plan permits or recorded as a security exception.
- WhatsApp -> webhook -> n8n -> AI -> CRM lead -> manager notification -> human handoff requires full real E2E evidence for automation handover.

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
