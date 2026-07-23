# AK BERMET — Operational Dashboard Implementation Report

## Result

**PASS**

## Objective

Implement the first read-only Operational CRM screen (`/manager/operations`) in the
existing Next.js app, reading real data from the already-deployed `ak-bermet-dev`
Supabase project. Read-only, server-side only, no writes, no schema changes, no
external-system changes, no commits.

## Architecture reviewed before changing code

- `src/middleware.ts`, `src/lib/manager-auth.ts`, `src/lib/manager-session.ts` —
  existing PIN-based manager gate. Middleware already protects `/manager/:path*`;
  API routes re-check `isManagerAuthenticated()` independently (pattern used by
  `/api/manager/leads`).
- `src/app/manager/*`, `src/components/manager/*` — manager layout, sidebar,
  header, `ManagerStatCard`, `ManagerFilters`, table conventions, Tailwind style
  tokens (`emerald-deep`, `gold`, `cream`, etc.).
- `src/lib/google-sheets.ts` — established pattern for a server-only integration
  module: lazy client init, `is<X>Configured()` guard, never imported from client
  components. Mirrored for the new Supabase module.
- `supabase/migrations/*` — confirmed via `npx supabase migration list` that all
  16 Phase 1 + Phase 2 migrations are applied to the linked `ak-bermet-dev`
  project (local hash == remote hash for every file), including the Operational
  CRM tables (`cleaning_tasks`, `maintenance_requests`, `room_inspections`,
  `operational_notifications`, `staff_assignments`) and their RLS policies
  (`20260722001700_operational_rls.sql`). No SQL was executed to reach this
  conclusion — only the CLI's own migration-status comparison.
- Confirmed there was no existing Supabase client/dependency anywhere in `src/`
  or `package.json` — this is a new integration, not a refactor.

## Known limitation (documented, not worked around)

The deployed schema models five real roles (`owner`, `administrator`, `manager`,
`housekeeping`, `technician`) via `profiles` + `user_roles`, enforced by RLS. The
running app, however, has no Supabase Auth session at all — only a single shared
PIN cookie gating the entire `/manager` area (`MANAGER_ACCESS_PIN`). Per this
task's constraints ("reuse existing authentication", "do not create users"), the
new route relies on that same existing gate rather than inventing a parallel
role system. Practically, this means:

- `/manager/operations` is exactly as protected as every other `/manager/*`
  route today — no more, no less.
- Reads run through a server-side Supabase **service-role** client (necessary
  because there is no per-user JWT to run authenticated-role queries as), which
  bypasses RLS by design. RLS itself was not touched, weakened, or queried in a
  way that could weaken it — it simply isn't the enforcement layer for this
  route, the same way it isn't for the rest of the manager cabinet in its
  current PIN-only state.
- One concrete consequence: `operational_notifications` RLS would normally
  scope a `manager`-role user to their own rows only (`recipient_id = auth.uid()`).
  Since there's no real authenticated user here, the dashboard shows the
  recent shared notification feed (latest 200) instead. This is flagged here
  rather than silently deviating from the schema's intended behavior.

Wiring real per-user Supabase Auth + role claims is a larger, separate task
(schema already anticipates it) and was out of scope here.

## Changed files

**New:**
- `src/lib/supabase-admin.ts` — server-only Supabase client factory (service-role
  key, lazy init, `isSupabaseConfigured()` guard). Never imported by a `"use client"` file.
- `src/lib/operations-data.ts` — server-only data-access layer. Every function is
  a `select(...)`; no `insert`/`update`/`delete`/`rpc` call exists anywhere in the file.
- `src/lib/operations-labels.ts` — Russian status labels/order + `summarizeRooms()`.
- `src/types/operations.ts` — TypeScript types for the operational-CRM read models.
- `src/components/manager/OperationsFilters.tsx` — building / room status /
  cleaning status / maintenance status / assignee filter bar (client component).
- `src/app/api/manager/operations/route.ts` — `GET` route handler: re-checks
  manager auth, checks Supabase config, calls the read-only data layer, returns JSON.
- `src/app/manager/operations/page.tsx` — the protected dashboard screen.
- `ai-system/reports/AK_BERMET_OPERATIONAL_DASHBOARD_IMPLEMENTATION.md` — this report.

**Modified:**
- `package.json` / `package-lock.json` — added `@supabase/supabase-js` (server-only usage).
- `.env.example` — added `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as **empty
  placeholders** with comments warning against `NEXT_PUBLIC_` prefixing and against committing real values.
- `src/components/manager/ManagerSidebar.tsx` — added an "Операции" nav entry
  pointing at `/manager/operations`, following the existing nav-item convention.
- `tsconfig.tsbuildinfo` — regenerated automatically by `tsc`/`next build`; not a source change.

No other files were touched. Google Sheets integration code (`src/lib/google-sheets.ts`
and its callers) is untouched and unaffected.

## Route created

`/manager/operations` — protected by the existing `src/middleware.ts` matcher
(`/manager/:path*`) plus a second server-side check in `/api/manager/operations`.

## Data sources used (Supabase `ak-bermet-dev`, read-only)

- `room_units` (+ `buildings`) — summary counts and building filter.
- `cleaning_tasks` (+ `room_units` → `buildings`, `staff_assignments` → `profiles`)
- `maintenance_requests` (+ `room_units` → `buildings`, `staff_assignments` → `profiles`)
- `room_inspections` (+ `room_units` → `buildings`, `profiles`)
- `operational_notifications` (+ `profiles`)

Each list is capped at the 200 most recent rows (`order by created_at desc`), and
`room_units` is capped at 1000 rows (matches the project's own `max_rows` API
setting) — a defensive bound, not a filter.

## Screen contents

- Summary cards: **Всего номеров** + the 7 requested `room_operational_status`
  states (Готов / Требуется уборка / Уборка в процессе / Требуется проверка /
  Требуется ремонт / Ремонт в процессе / Заблокирован), recomputed client-side
  from the fetched room list so the **building** filter can affect them without
  a second round trip.
- Filters: корпус (building), статус номера (room state), статус уборки,
  статус ремонта, исполнитель (assignee) — assignee list is derived from actual
  `staff_assignments` / `inspected_by` / `recipient_id` values present in the
  fetched data (no separate roster query was added).
- Four read-only lists: уборка (cleaning_tasks), ремонт (maintenance_requests),
  проверки номеров (room_inspections), уведомления (operational_notifications) —
  each with a dedicated empty state when filters produce zero rows.
- Explicit configuration-missing message when `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` are absent (checked server-side in the API route,
  surfaced by the client page) — no attempt to reach Supabase is made in that case.
- All labels are Russian, consistent with the rest of the manager cabinet.

## Security

- All Supabase reads happen in `src/lib/operations-data.ts`, invoked only from
  `src/app/api/manager/operations/route.ts` (a server route handler, `runtime = "nodejs"`).
  The service-role key is read from `process.env` server-side only and is never
  passed to the client — the page component only ever calls its own `/api/manager/operations` endpoint.
- No `NEXT_PUBLIC_`-prefixed Supabase variable exists anywhere.
- No secret values were written to any file; `.env.example` placeholders are empty.
- No RLS policy was created, altered, or dropped.
- No database write path (`insert`/`update`/`delete`/RPC) exists in any new file — verified by inspection of `src/lib/operations-data.ts`.

## Test results (run once, at the end)

```
npm run lint      → ✔ No ESLint warnings or errors
npx tsc --noEmit  → no output, exit 0
npm run build     → ✓ Compiled successfully, 42/42 pages generated,
                     /manager/operations built (6.68 kB, static shell)
                     /api/manager/operations built (dynamic route)
```

No dev server was started and no browser click-through was performed, because
no real `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` were provided or fetched —
doing so would have required obtaining/using live credentials, which is outside
this task's "never hardcode/expose keys" and "no external-system access"
constraints. The build output confirms the page and API route compile and
render their static shell; the "not configured" code path is what will render
until real credentials are placed in a local, untracked `.env.local`.

## Confirmation

- No SQL was executed against Supabase (only read-only `supabase migration list`
  / `supabase projects list` CLI status checks, no `supabase db push` / `db reset` / DDL / DML).
- No Supabase table, RLS policy, function, or migration was created, altered, or dropped.
- No Google Sheets, n8n, or other external service was modified.
- No database records were created, updated, or deleted; no users were created.
- No git commit, push, merge, or deploy was performed — changes are unstaged
  working-tree edits only (`git status` reflects this).
