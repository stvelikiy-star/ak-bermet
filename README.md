# AK BERMET — SPA & WELLNESS

AK BERMET is one connected resort platform: public website, booking/availability, manager CRM and staff operations. Current application stack: **Next.js 15.5.21 + TypeScript + Tailwind CSS + Supabase**.

## Current architecture — 2026-08-29

### Transactional source of truth

**Supabase/PostgreSQL is authoritative** for operational data:

- staff authentication and roles;
- room inventory;
- bookings and booking rooms;
- occupancy periods;
- durable holds;
- leads;
- cleaning, maintenance and inspections;
- operational history.

Google Sheets is a **support/mirror/import/cutover surface**, not the authority for concurrent availability or booking decisions. A Sheets failure must never roll back or override a newer Supabase write.

### Public availability

Non-mock availability reads authoritative Supabase `room_units` + active `occupancy_periods` and validates active nonexpired durable holds. Maintenance and stop-sale periods remain blocking. Authority read failure is fail-closed; the application must not invent free rooms.

Explicit mock availability is allowed only in local `development`/`test` with `AVAILABILITY_SOURCE=mock`.

### AI chat

Real AI is supported through the provider layer. Production/non-local mode never silently falls back to mock. Real mode requires the explicit provider gates and API key; provider/configuration failure returns a sanitized 503/handoff response. Mock is limited to explicit local development/test use.

### Authentication and staff

Protected staff routes use **Supabase Auth + RLS**, not a shared manager PIN.

Roles:

- `owner`;
- `administrator`;
- `manager`;
- `housekeeping`;
- `technician`.

Protected areas include `/manager`, `/housekeeping` and `/technician`. Missing/invalid Auth fails closed.

## Current verified business invariants

- inventory: **169 accommodation units**;
- official capacity: **407 beds**;
- maximum approved capacity: **484**;
- required prepayment: **20%**;
- check-in: **13:00**;
- check-out: **11:00**;
- cancellation >=7 days before arrival: refund may be possible subject to applicable fee and administrator procedure;
- cancellation <7 days: prepayment is non-refundable;
- no-show: prepayment is non-refundable;
- children are charged from age 3;
- child meals: 1440 KGS/day;
- child extra bed: 1500 KGS/day;
- adult extra meals: 1800 KGS/day;
- adult extra bed: 1800 KGS/day;
- parking: 150 KGS/day in summer, 100 KGS/day otherwise.

## Current business-data gaps

These are intentionally **not guessed**:

- the working spreadsheet currently has no real booking rows loaded for cutover;
- the working spreadsheet currently has no payment rows loaded;
- safe room-to-price mapping is confirmed for 154/169 rooms; 14 standard rooms in Corpus 3 and `C3-301` remain unpriced/unresolved until authoritative evidence is supplied;
- production cutover/deployment requires a separate explicit owner approval.

## Public routes

- `/` — main site;
- `/rooms`;
- `/garden`;
- `/hot-springs`;
- `/spa`;
- `/events`;
- `/food`;
- `/promos`;
- `/contacts`;
- `/faq`.

## Manager and staff routes

- `/staff/login` — Supabase Auth;
- `/manager` — operational overview;
- `/manager/leads` — leads;
- `/manager/availability` — authoritative booking chessboard;
- `/manager/bookings` — bookings/manual booking;
- `/manager/rooms` — room inventory;
- `/manager/operations` — operations;
- `/manager/inspections` — inspections;
- `/manager/payments` — booking/payment obligations; do not infer actual paid/balance without an authoritative ledger;
- `/manager/reports` — reports;
- `/manager/settings` — business settings;
- `/housekeeping` — housekeeping workspace;
- `/technician` — technician workspace.

## Development

```bash
npm ci
npm run dev
```

Main verification gates:

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run test:legal-contract
npm run test:ai-provider-mode
npm run test:availability-authority
npm run test:booking-chessboard
npm run test:inspection
npm run test:housekeeping
npm run test:technician
npm run build
```

The GitHub **Production Readiness** workflow additionally runs dependency/security, room/pricing, booking, Supabase security, lead durability, staff-auth, Sheets-mirror, backup/preflight, generated-file hygiene and Docker gates.

## Photos and project Drive

The owner-provided shared AK BERMET Drive is readable as of 2026-08-29. `03_Photos` contains canonical category folders (`Rooms`, `Garden`, `Hot Springs`, `SPA`, `Events`, `Food`, `Territory`, `Logo`) and named room folders. Preserve source names; do not rename or invent media identity.

## Release boundary

A green repository/CI state is **not** proof of production deployment. Before cutover, separately verify runtime synchronization, current bookings, current real-session staff UAT, unresolved pricing/payment data, backup/restore evidence and explicit production approval.

Historical stage documents may describe older mock/Sheets/PIN architectures. They are not current authority. For current facts use this README, `ai-system/CURRENT_STATE.md`, current code and current GitHub/DEV evidence.
