# AK BERMET — Supabase Auth & Role-Based Access Foundation

## Result

**PASS**

## Objective

Replace shared-PIN-only staff access with Supabase Auth (email/password) as
the long-term authentication model, using the already-deployed `ak-bermet-dev`
schema (`profiles`, `roles`, `user_roles`), while keeping the existing manager
PIN working as a clearly-labeled emergency fallback. Foundation only — no real
staff accounts created, no SQL/migrations executed, no external systems touched.

## Architecture reviewed before changing code

- `src/middleware.ts` — previously PIN-only, `/manager/:path*` matcher only.
- `src/lib/manager-auth.ts` / `src/lib/manager-session.ts` — PIN hashing +
  `isManagerAuthenticated()`, used by every `/api/manager/*` route handler.
- `src/app/manager/layout.tsx`, `src/app/manager/login/page.tsx` — existing
  manager shell and PIN login screen.
- `supabase/migrations/20260721000200_identity_and_roles.sql` — confirmed
  `profiles`/`roles`/`user_roles` shape, `has_role()`/`is_staff()` helpers.
- `supabase/migrations/20260721000800_rls_policies.sql` — confirmed
  **self-select RLS policies already exist**: `profiles_self_select` (`id =
  auth.uid()`) and `user_roles_self_select` (`user_id = auth.uid()`). This is
  why role lookups in this implementation use the **publishable-key, user-
  session client** (RLS-scoped, no elevated access) rather than the service-
  role client — the service-role key is not "strictly necessary" for reading
  a user's own roles, so it isn't used for that.
- `src/lib/supabase-admin.ts` (added in the prior Operational CRM task) —
  confirmed as the only existing Supabase integration point; reused/renamed
  its URL variable rather than introducing a second, inconsistent one.
- Confirmed via prior-session `supabase migration list` check (not repeated
  here) that the schema, including RLS, is already live on `ak-bermet-dev`.

## Auth flow summary

1. **Sign-in** (`/staff/login`, client component): calls
   `supabase.auth.signInWithPassword()` through a **browser** client
   (`src/lib/supabase/browser-client.ts`) built with the **publishable/anon
   key only**. `@supabase/ssr`'s browser client stores the session in cookies
   compatible with the server-side helpers below — no manual cookie handling.
2. **Session refresh** (`src/middleware.ts`, all requests to `/manager/*`,
   `/housekeeping/*`, `/technician/*`): a request-scoped client
   (`src/lib/supabase/middleware-client.ts`) calls `supabase.auth.getUser()`,
   which both validates the JWT with the Auth server and refreshes/rewrites
   the session cookies on the response so Server Components see a live session.
3. **Route protection** (same middleware pass): for each of the three staff
   areas, if no legacy PIN is present (see below) the middleware checks for a
   Supabase user, then queries `user_roles → roles` (self-select RLS, no
   service-role) to decide allow / `/staff/unauthorized` / `/staff/login`.
4. **Defense in depth**: `/housekeeping` and `/technician` also call
   `requireStaffRole()` (`src/lib/auth/require-role.ts`) in their own
   `layout.tsx`, independently re-checking via `getCurrentStaff()`
   (`src/lib/auth/current-staff.ts`). `/manager` is deliberately **not**
   double-guarded in its layout — `/manager/login` lives inside the same route
   subtree, and a layout-level guard would incorrectly gate the login page
   itself; the middleware's pathname-based exemption is the only reliable
   place for that distinction.
5. **API-level check**: `isManagerAuthenticated()`
   (`src/lib/manager-session.ts`), used by every `/api/manager/*` handler
   (including `/api/manager/operations`), now accepts **either** a valid
   legacy PIN cookie **or** a Supabase session with an owner/administrator/
   manager role — so pages and their data APIs agree on who's allowed in.
6. **Sign-out**: `/api/staff/logout` calls `supabase.auth.signOut()` via the
   cookie-bound server client. `ManagerHeader`'s logout button now clears
   *both* the legacy PIN cookie and the Supabase session and lands on
   `/staff/login`, regardless of which method the user signed in with.
7. **Email-link callback**: `/auth/callback` implements the standard
   `exchangeCodeForSession()` PKCE handler, needed for password-reset/invite/
   email-confirmation links Supabase Auth sends — not used by the plain
   email/password sign-in itself, but required infrastructure for staff
   onboarding once real accounts exist.

## Role mapping

| Route            | Allowed roles                        | Legacy fallback |
|-------------------|--------------------------------------|------------------|
| `/manager/*`       | `owner`, `administrator`, `manager`  | PIN cookie (temporary, see below) |
| `/housekeeping/*`  | `housekeeping`                       | none |
| `/technician/*`    | `technician`                         | none |

Roles are read live from `public.user_roles` joined to `public.roles`
(`deleted_at is null`), never cached/baked into a JWT claim — this task did
not modify the schema or add a claims-sync trigger, so a role change takes
effect on the next request, not the next token refresh.

## Legacy PIN — marked as fallback, not removed

Per the task's explicit instruction, the PIN mechanism is untouched
functionally and still fully works:

- `src/lib/manager-auth.ts` — header comment rewritten to state it's legacy/
  fallback-only.
- `.env.example` — the PIN section header now reads "ЛЕГАСИ РЕЗЕРВНЫЙ ВХОД"
  with an explanation to use Supabase Auth for new staff.
- `/manager/login` — now shows an amber "устаревший способ входа" notice
  linking to `/staff/login`, and its heading changed from "Кабинет менеджера"
  to "Резервный вход (PIN)".
- `src/middleware.ts` — PIN is checked **first**, before any Supabase call,
  for `/manager/*` only; if valid, the request proceeds exactly as before
  with zero behavior change from the pre-existing implementation.
- `isManagerAuthenticated()` — PIN branch is untouched code, Supabase branch
  is additive (`||` semantics, not a replacement).

## Changed files

**New:**
- `src/types/auth.ts` — `RoleName`, `ROLE_LABELS`, `CurrentStaff`.
- `src/lib/supabase/browser-client.ts` — browser client, publishable key only.
- `src/lib/supabase/server-client.ts` — cookie-bound server client (Server
  Components / route handlers), publishable key only.
- `src/lib/supabase/middleware-client.ts` — request-scoped client + cookie
  refresh for `src/middleware.ts`.
- `src/lib/auth/current-staff.ts` — `getCurrentStaff()`, `hasAnyRole()`; reads
  `auth.getUser()` + own `profiles`/`user_roles` rows under RLS.
- `src/lib/auth/require-role.ts` — reusable `requireStaffRole(allowed)` guard
  for protected layouts.
- `src/app/staff/login/page.tsx` — primary staff login (email/password),
  Russian UI, explicit "Supabase Auth not configured" state, link to legacy
  PIN login, open-redirect-safe `?from=` handling.
- `src/app/staff/unauthorized/page.tsx` — clear "Доступ запрещён" page,
  shows the user's actual roles when known.
- `src/app/auth/callback/route.ts` — PKCE code-exchange handler.
- `src/app/api/staff/logout/route.ts` — Supabase sign-out route handler.
- `src/app/housekeeping/layout.tsx`, `src/app/housekeeping/page.tsx` — minimal
  protected placeholder area (role: `housekeeping`).
- `src/app/technician/layout.tsx`, `src/app/technician/page.tsx` — minimal
  protected placeholder area (role: `technician`).
- `ai-system/reports/AK_BERMET_SUPABASE_AUTH_IMPLEMENTATION.md` — this report.

**Modified:**
- `package.json` / `package-lock.json` — added `@supabase/ssr`.
- `.env.example` — added `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (empty placeholders); re-labeled the
  PIN section as legacy; expanded the Service Role comment.
- `src/middleware.ts` — rewritten: Supabase session refresh + role-based
  protection for `/manager`, `/housekeeping`, `/technician`; PIN check
  preserved as the first, cheapest branch for `/manager` only; matcher
  extended accordingly.
- `src/lib/manager-session.ts` — `isManagerAuthenticated()` now also accepts
  a Supabase session with an owner/administrator/manager role.
- `src/lib/manager-auth.ts` — comment-only change marking the module legacy.
- `src/lib/supabase-admin.ts` — reads `NEXT_PUBLIC_SUPABASE_URL` instead of
  the old non-public `SUPABASE_URL` (URL isn't secret; consolidates on one
  variable name used everywhere). `SUPABASE_SERVICE_ROLE_KEY` usage unchanged.
- `src/app/manager/layout.tsx` — stale `TODO Stage 09` comment replaced with
  an explanation of where protection actually lives and why.
- `src/app/manager/login/page.tsx` — legacy notice + link to `/staff/login`.
- `src/components/manager/ManagerHeader.tsx` — logout now clears both auth
  paths and redirects to `/staff/login`.
- `tsconfig.tsbuildinfo` — build artifact, regenerated automatically.

No Google Sheets code, `supabase/migrations/*`, or `/manager/operations`
data-access code (`src/lib/operations-data.ts`) was modified.

## Routes created

- `/staff/login` — primary staff sign-in (Supabase Auth, email/password).
- `/staff/unauthorized` — shown when authenticated but role doesn't match the area.
- `/auth/callback` — Supabase Auth email-link code exchange.
- `/api/staff/logout` — POST, clears the Supabase session.
- `/housekeeping` — placeholder landing page, role-protected (`housekeeping`).
- `/technician` — placeholder landing page, role-protected (`technician`).
- `/manager/*` — existing route, protection model upgraded (dual-path, see above).

## A bug caught and fixed during implementation

Initial `npm run build` (run without real Supabase credentials, matching this
sandbox) prerendered `/housekeeping`, `/technician`, and `/staff/unauthorized`
as **static** pages (`○`) instead of dynamic (`ƒ`). Root cause: when
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are unset,
`createSupabaseServerClient()` returns `null` **before** calling `cookies()`,
so Next.js never detects a dynamic API call during prerendering and bakes the
computed `redirect("/staff/login")` in as a permanent, cached response for
every visitor — including ones who would later have a valid session, once
credentials are configured but a stale build artifact is still being served.
Fixed by adding `export const dynamic = "force-dynamic";` to all three routes,
confirmed by a second build showing `ƒ` for all three. This directly serves
the task's "safe handling when environment variables are missing" requirement
— missing config now fails safe (per-request redirect) rather than baking in
a stale answer.

## Test results (run once, at the end)

```
npm run lint      → ✔ No ESLint warnings or errors
npx tsc --noEmit  → no output, exit 0
npm run build     → ✓ Compiled successfully, 47/47 pages generated
                     /staff/login            ○ static (client-rendered form)
                     /staff/unauthorized     ƒ dynamic
                     /housekeeping           ƒ dynamic
                     /technician             ƒ dynamic
                     /auth/callback          ƒ dynamic
                     /api/staff/logout       ƒ dynamic
                     /manager/operations     ○ static shell (unchanged)
```

No dev server was started and no login was attempted against a live project —
doing so would require real `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values and, per the task, no real staff
accounts exist to sign in with yet. The build output confirms every new route
compiles, type-checks, and renders its correct static/dynamic shell; the
"Supabase Auth not configured" and "not authenticated" code paths are what
will actually render until real credentials and accounts exist.

## Remaining manual steps (not performed by this task)

1. Add real values for `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API, publishable/
   anon key) to a local, untracked `.env.local` for `ak-bermet-dev`.
2. Create real staff Supabase Auth accounts (Dashboard → Authentication →
   Users, or the Admin API) — explicitly out of scope here ("do not create
   real staff users yet").
3. For each created auth user, insert a matching `profiles` row and at least
   one `user_roles` row (owner/administrator/manager/housekeeping/technician)
   — this is a data/SQL action, intentionally not performed by this task.
4. End-to-end test `/staff/login` → role redirect → `/manager` or
   `/housekeeping` or `/technician` against a real account in a non-production
   environment before rolling out to real staff.
5. Decide a retirement timeline for the PIN fallback (`MANAGER_AUTH_ENABLED`)
   once staff have real accounts; flipping it to `false` (or removing the
   legacy code path) is a follow-up, not done here.
6. Build out the actual `/housekeeping` and `/technician` work screens — this
   task only established the protected shell, mirroring how
   `/manager/operations` was the first real screen behind the manager gate.

## Confirmation

- No SQL was executed and no Supabase migration, table, RLS policy, or
  function was created, altered, or dropped — this task is entirely
  application-code (Next.js) work reading the already-deployed schema.
- No real staff `auth.users`, `profiles`, or `user_roles` rows were created.
- No Google Sheets, n8n, or other external service was modified.
- No database records were created, updated, or deleted.
- No git commit, push, merge, or deploy was performed — all changes are
  unstaged working-tree edits (`git status`).
