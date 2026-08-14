# AK BERMET — DEV Staff Auth Provisioning Runbook

Status: prepared, execution disabled by default.
Target: **ak-bermet-dev only** (`ednqgzgjhnalsiiuekmw`).
Production authority: **none**.

## Purpose

Provision the approved 17 numbered staff logins through the supported Supabase Auth Admin API, then create the matching `public.profiles` and exactly one `public.user_roles` binding per slot.

The provisioner never inserts directly into `auth.users`, never creates a custom session system, never prints email/password values, and never changes production.

Approved slots:

- Собственник 1 — owner
- Администратор 1 — administrator
- Менеджер 1..4 — manager
- Горничная 1..6 — housekeeping
- Техник 1..5 — technician

Building/property assignments are intentionally **not invented**. They remain a separate explicit operational assignment after the staff accounts exist.

## Credential manifest

Keep the manifest outside the repository, for example:

`/home/agent/.config/ai-prof-control-center/ak-bermet-staff-auth.json`

Required permissions on Linux: `0600`, owned by the executing user, regular file, not a symlink.

Schema:

```json
{
  "version": 1,
  "project": "ak-bermet-dev",
  "slots": [
    {
      "slot": "owner-1",
      "email": "<approved-login-email>",
      "password": "<approved-unique-password>"
    }
  ]
}
```

All 17 exact slots are required. The manifest supplies credentials only; role and visible slot label come from the fixed source contract in `scripts/staff-auth-provisioner.mjs`.

Never paste the completed manifest into chat, GitHub issues, PRs, logs, or source files.

## Offline dry-run

Default mode validates only the manifest and performs no network call:

```bash
node scripts/staff-auth-provisioner.mjs \
  --manifest /home/agent/.config/ai-prof-control-center/ak-bermet-staff-auth.json
```

Expected safe result:

```text
RESULT: PASS mode=dry-run slots=17
NOTE: no network calls or user/database changes were performed.
```

## DEV execution gate

Execution requires all of the following simultaneously:

- `--execute`
- `AK_BERMET_AUTH_PROVISION_ENABLED=YES`
- `AK_BERMET_AUTH_TARGET=DEV`
- `NEXT_PUBLIC_SUPABASE_URL=https://ednqgzgjhnalsiiuekmw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` present locally
- if `SUPABASE_PROJECT_REF` is present, it must equal `ednqgzgjhnalsiiuekmw`

The script refuses every other Supabase host.

## Atomicity / compensation

Supabase Auth and public schema writes cannot share one database transaction. To avoid leaving a half-created batch, the provisioner tracks every Auth user created during the current run. If any later slot/profile/role/postcondition fails, it deletes all Auth users created by that run in reverse order; the existing `auth.users -> profiles -> user_roles` cascade removes their public rows.

Existing users are never silently taken over. An existing email is accepted only when its `staff_slot` metadata, profile label, active state, and single role binding already match the fixed slot contract exactly; otherwise execution blocks.

## Postconditions

A successful execute must report only counts, never credentials:

```text
RESULT: PASS mode=execute created=<N> existing=<N> total=17
NOTE: credentials and secret values were not printed.
```

After provisioning, perform real-session UAT for owner / administrator / manager / housekeeping / technician before any production cutover.

## Explicit non-goals

This runbook does not:

- create real employee names;
- choose or invent business email addresses;
- assign housekeepers/technicians to buildings;
- enter real bookings;
- enable Google Sheets mirror execution;
- apply production migrations;
- deploy production.
