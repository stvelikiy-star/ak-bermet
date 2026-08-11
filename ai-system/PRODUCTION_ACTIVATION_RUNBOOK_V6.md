# AK BERMET — Production Activation Runbook V6

Status: PREPARED / NOT EXECUTED

This runbook is intentionally fail-closed. It describes the production activation order but does not authorize or perform production changes.

## Proven repository state

- Runtime: Node >=22; production container uses Node 22 Alpine.
- Production Readiness CI builds the Next.js production bundle and Docker image.
- Hardened read-only PostgreSQL backup script exists at `supabase/migrations/ak-bermet-production-backup.sh`.
- Approved schema chain contains exactly 18 timestamped SQL migrations.
- No timestamped SQL migrations were added after the release migration set.
- Repository does not define a verified live hosting/deployment target. The actual target and currently deployed SHA must therefore be discovered from the live environment before any deploy.

## Approved migration order

1. `20260721000100_extensions_and_enums.sql`
2. `20260721000200_identity_and_roles.sql`
3. `20260721000300_inventory.sql`
4. `20260721000400_customers_leads.sql`
5. `20260721000500_booking_core.sql`
6. `20260721000600_booking_integrity.sql`
7. `20260721000700_audit_and_integrations.sql`
8. `20260721000800_rls_policies.sql`
9. `20260721000900_seed_reference_data.sql`
10. `20260722001100_operational_enums.sql`
11. `20260722001200_cleaning.sql`
12. `20260722001300_maintenance.sql`
13. `20260722001400_room_inspections.sql`
14. `20260722001500_attachments_and_history.sql`
15. `20260722001600_operational_automation.sql`
16. `20260722001700_operational_rls.sql`
17. `20260727000100_manager_inspection_blocking_problem.sql`
18. `20260728000100_availability_hold_atomicity.sql`

Never use `supabase db reset` against production. Never replay all migrations blindly. Apply only migrations proven missing from the production migration ledger, in filename order.

## Activation sequence

### C1 — Freeze release SHA

Record the exact `main` commit intended for production. Do not deploy a moving branch name without recording the SHA.

### C2 — Read-only live discovery

Before any write:

- identify the real hosting/deployment target;
- identify the currently deployed application SHA/version;
- confirm the Supabase project reference;
- inspect the production migration ledger;
- verify required application/release environment names exist without printing their values;
- confirm the production database major version is compatible with the repository Supabase config.

If any target/project/ledger identity is ambiguous: BLOCKED.

### C3 — Repository and environment preflight

Run the non-destructive structural preflight first:

```bash
node scripts/production-preflight.mjs
```

Then, in the approved operator environment only, load secrets through the approved secret source and run:

```bash
npm run preflight:production
```

The command checks names/gates only. It must not print secret values or contact production.

### C4 — Fresh production backup

A fresh backup is mandatory immediately before migration work. Historical backups are evidence only and do not satisfy this step.

Requirements:

- explicit owner/operator approval for the backup;
- `AK_BERMET_BACKUP_APPROVED=YES` only for this operation;
- `AK_BERMET_DATABASE_URL` supplied through environment/secret source, not argv;
- local `postgres:17-alpine` image already present;
- backup script completes archive validation and SHA-256 verification;
- record the published backup path and timestamp.

If backup or validation fails: STOP. Do not migrate or deploy.

### C5 — Migration ledger reconciliation

Compare the production migration ledger with the exact 18-file list above.

Classify every migration as:

- APPLIED — exact migration already recorded;
- MISSING — eligible to apply in ordered sequence after backup;
- DIVERGED/UNKNOWN — STOP and investigate before any write.

Never infer that a migration is applied merely because a table/object appears to exist.

### C6 — Apply only missing migrations

Only after C1–C5 PASS and explicit production-change approval:

- apply missing migrations in timestamp order;
- stop on first failure;
- do not run destructive reset/rollback automatically;
- capture the resulting migration ledger;
- run non-destructive schema/RLS/integrity validation before deploying the application.

### C7 — Deploy the frozen SHA

Deploy only the SHA recorded in C1 to the verified live target discovered in C2.

The repository alone does not prove the hosting target, so this step remains BLOCKED until that live target is identified.

### C8 — Production smoke

Required smoke checks after deploy:

- public site loads;
- room/catalog pages show V6-safe content;
- `POST /api/leads` persists durably or fails closed — never mock-success;
- staff authentication uses Supabase Auth and unauthorized access is denied;
- manager/housekeeping/technician role boundaries work;
- availability/hold flow fails closed on unavailable/unknown data;
- hold atomicity/idempotency remains enforced;
- housekeeping → inspection/ready lifecycle works;
- maintenance-blocking lifecycle works;
- no secret appears in browser payloads/logged command lines.

### C9 — Keep room activation fail-closed

The Google Sheet room register is reconciled to 169 units / 407 official places / 484 maximum places, but operational activation remains gated until production data has been reconciled and smoke-tested.

Do not auto-price the 14 standard rooms in Corpus 3 and do not auto-map room 301 (`4-х семейный-3`) until owner/admin source data resolves those tariff gaps.

## Production blockers that repository inspection cannot resolve

- actual live hosting/deployment target and current deployed SHA;
- current production environment values/presence;
- current Supabase project identity and migration ledger;
- fresh backup for the upcoming activation cycle;
- owner/legal refund policy decision;
- Corpus 3 standard price;
- room 301 tariff semantics.

These are not safe to infer from source code.
