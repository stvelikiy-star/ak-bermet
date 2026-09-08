# AK BERMET — public domain cutover evidence — 2026-09-08

## Current public state

A fresh external fetch of `https://akbermet.kg/` on 2026-09-08 still resolves to the legacy site and redirects to `/en/`.

The served page identifies itself as the old `Hotel Prime - Акбермет` implementation and still contains its legacy booking/cart interface.

The legacy public room list currently advertises categories including wooden cottages and a log house, while the new authoritative Supabase AK BERMET database intentionally keeps all 17 cottage/log-house units `blocked + inactive` with `DO_NOT_ACTIVATE` staging protection.

Therefore the legacy website must not be treated as an authoritative source of current availability during final cutover.

## Release implication

Until the new accepted release is deployed and verified:

- `akbermet.kg` remains the legacy production target;
- the new CRM/Supabase availability authority is not yet the public domain authority;
- the public domain must not be switched to an unverified/stale Vercel deployment;
- old-site room availability must not be imported into the new database as fact.

## Safe domain cutover

Before changing DNS/domain routing:

1. Deploy the exact accepted AK BERMET `main` SHA to the final Vercel target.
2. Verify public `/api/availability` returns only approved active inventory from Supabase.
3. Verify the 32 blocked/inactive units cannot appear as sellable availability.
4. Run RU/KG/EN/KZ desktop/mobile browser UAT.
5. Run no-5xx/runtime checks.
6. Preserve the legacy hosting/DNS target as rollback information.
7. Only then switch `akbermet.kg` to the new deployment.
8. Re-check HTTPS, canonical host, www/non-www behavior, robots and sitemap after the switch.

Do not remove the old target until the new domain path is green and owner acceptance is recorded.
