# AK BERMET — Supabase → Google Sheets Mirror Runbook

Date: 2026-08-13 (+06:00)
Status: DEV/QA runbook — production unchanged

## Authority contract

- Supabase/PostgreSQL is the only operational source of truth.
- Google Sheets is a secondary one-way mirror.
- The worker never writes business data from Sheets back to Supabase.
- A Sheets outage must never roll back or reject a newer authoritative Supabase write.

## Verified prerequisites

- DEV migration ledger: 20/20; latest `20260813060026_sheets_sync_outbox_plumbing`.
- Durable queue/history RPCs are service-role only.
- Queue claim uses `FOR UPDATE SKIP LOCKED` and a 15-minute stale-claim lease.
- `Номера`: 169/169 unique `supabase_room_unit_id` values populated and control-checked against DEV.
- `Корпуса`: explicit `supabase_building_id` column populated for all 7 active V6 groups plus soft-deleted legacy Corpus 4.
- Dynamic mirror sheets use dedicated Supabase UUID anchor columns.

## Required runtime environment names

Do not commit values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SHEETS_ENABLED=true`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Execution has an additional independent gate:

- `AK_BERMET_SHEETS_MIRROR_ENABLED=YES`

Any other value keeps execution blocked.

## Safe first check — no queue claim / no Sheets write

```bash
npm run sync:sheets:dry-run -- --limit=25
```

Dry-run reads pending queue rows, authoritative Supabase rows and UUID anchors in Sheets. It does not claim queue rows and does not write Sheets.

Expected when the queue is empty:

```text
RESULT: PASS queue=0
```

If dry-run reports `DRY_BLOCKED`, fix the mapping/schema/configuration cause before enabling execution.

## Execute a bounded batch

Only after a credentialed dry-run is PASS:

```bash
AK_BERMET_SHEETS_MIRROR_ENABLED=YES npm run sync:sheets:execute -- --limit=25
```

The worker:

1. claims a bounded batch through `fn_claim_sheets_sync_batch`;
2. re-reads the current authoritative entity from Supabase;
3. validates the queue target against a hard-coded allowlist;
4. finds the Sheets row by exact Supabase UUID only;
5. updates only explicit DB-owned columns;
6. appends dynamic records only with a Supabase UUID anchor;
7. never appends a missing building/room mapping;
8. finalizes success/failure through `fn_finish_sheets_sync`.

## Retry and crash behavior

- A failed attempt returns to `pending` until the bounded retry budget is exhausted.
- An interrupted `in_progress` claim becomes reclaimable after 15 minutes.
- If a Sheets write succeeds but queue finalization fails, a later retry finds the same UUID row and updates it idempotently rather than appending a duplicate.
- Hard-missing dynamic entities are retained in the mirror and marked `DELETED_IN_SUPABASE`; the worker does not destructively delete mirror history.

## Inventory safety

`buildings` and `room_units` are update-only in the worker. If their Supabase UUID is not already mapped in Sheets, the worker fails closed with `SYNC_MAPPING_REQUIRED` rather than inventing a business/source ID.

Do not add a new room/building through the mirror worker. Add it through the authoritative business/data workflow, then establish the UUID mapping explicitly.

## Logs and secrets

- Worker output contains table names and action/error codes only.
- Do not log entity payloads, phones, emails, names, credentials or private keys.
- Never paste service-role or Google private-key values into GitHub, issues, Sheets or chat logs.

## Scheduler status

No recurring scheduler is enabled by this runbook or the worker PR. Enable a scheduler only after:

1. worker CI is green;
2. credentialed DEV dry-run is PASS;
3. at least one controlled DEV execution is verified end-to-end;
4. the runtime host has the required secrets stored outside Git.

Production deploy/migration remains a separate owner approval gate.
