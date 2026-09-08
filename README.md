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

## Current known external blockers

- GitHub `main` branch protection still must be enabled and verified.
- Supabase Leaked Password Protection must be enabled and re-verified.
- Current real hotel reservations must be obtained, validated and reconciled before public cutover.
- Remaining fail-closed pricing mappings require authoritative resolution/acceptance.
- Cottage operational readiness requires factual confirmation.
- Fresh live DB backup must be created immediately before production data cutover.
- Exact accepted `main` SHA still must be deployed to final Vercel production and pass public browser UAT.
- WhatsApp -> webhook -> n8n -> AI -> CRM lead -> manager notification -> human handoff requires full real E2E evidence for automation handover.

## Handover source of truth

Use:

- `HANDOVER_RELEASE_2026-09-08.md` — current handover state and cutover sequence.
- `TODO_NEXT_STAGES.md` — remaining release backlog only.
- `scripts/production-migrations-approved.json` — approved ordered migration ledger.

Historical Stage documents and older README content are retained in Git history only and must not be used as the current release status.

## Safety rules

- Never invent room availability or prices.
- Never treat Google Sheets as transactional availability authority.
- Never expose Supabase service-role credentials in client code.
- Never apply production migrations without an approved ledger, fresh backup and production approval.
- Never cut over `akbermet.kg` without a rollback path and completed evidence-backed gates.
