# AK BERMET Project Context

## Project

AK BERMET — SPA & WELLNESS resort public website, booking system, manager CRM, and unified operational CRM.

The project must be developed as one connected system. Do not create separate disconnected databases or applications as the primary operating contour.

## Current Verified State

- Public website: Next.js 14, App Router, TypeScript, Tailwind CSS.
- Manager area exists as an MVP.
- Leads CRM is connected to Google Sheets.
- `/manager/leads` and `/manager/leads/[id]` were previously implemented and verified.
- Lead status and manager comments can be written through the Google Sheets integration when configured.
- Booking draft functionality is currently preview-only.
- Availability, rooms, payments, reports, and some dashboard areas still depend on mock or read-only data.
- Current Ubuntu copy has no Supabase implementation.
- Current Ubuntu copy has no operational housekeeping or maintenance module.
- Google Sheets remains part of the current CRM and reporting workflow.

## Approved Target Architecture

### Primary backend

Supabase is the planned primary transactional backend for:

- authentication;
- user accounts;
- roles and permissions;
- room inventory;
- bookings;
- occupancy;
- payments;
- cleaning tasks;
- inspections;
- maintenance requests;
- room blocking;
- operational history;
- file and photo metadata.

Google Sheets may remain for reporting, exports, management visibility, and selected integrations, but must not be the final source of truth for concurrent booking and operational transactions.

### Unified CRM

The manager CRM, booking CRM, room inventory, housekeeping, inspection, repair, and technical blocking must remain inside one connected CRM architecture.

The first internal staff interface should be a responsive web/PWA application using the same backend and role model.

## Roles

Required roles include:

- owner;
- administrator;
- manager;
- housekeeping;
- technician.

Each user must have a personal account. Do not use one shared production PIN as the final authentication model.

## Operational Workflow

After guest checkout, the CRM must automatically create a cleaning task.

Housekeeping users must be able to:

- see only assigned cleaning tasks;
- accept a task;
- mark work started;
- mark work completed;
- report discovered problems;
- upload before and after photos.

Technicians must be able to:

- see maintenance requests;
- view priority, room, description, and photos;
- record diagnosis;
- record completed work;
- record materials used;
- mark work completed;
- upload result photos.

Administrators and managers must be able to inspect, approve, reassign, block, and review operational work according to permissions.

## Room Operational States

The unified room state model must support:

- `checkout_pending`;
- `cleaning_required`;
- `cleaning_in_progress`;
- `inspection_required`;
- `ready`;
- `maintenance_required`;
- `maintenance_in_progress`;
- `blocked`.

A room must not become `ready` until cleaning is completed and, when required, administrator inspection is approved.

Maintenance or technical blocking must prevent the room from being sold or confirmed for overlapping dates.

## Booking Rules

Known business rules include:

- check-in: 13:00;
- check-out: 11:00;
- prepayment: 20%;
- cancellation at least 7 days before arrival: refund may be possible according to approved policy;
- cancellation less than 7 days before arrival: no refund;
- no-show: no refund;
- children are charged from age 3;
- child meals: 1440 KGS;
- child extra bed: 1500 KGS;
- adult extra meals: 1800 KGS;
- adult extra bed: 1800 KGS;
- parking: 150 KGS in summer and 100 KGS in other seasons;
- early arrival and late departure require explicit handling and approval;
- availability and booking confirmation must prevent overbooking;
- final booking confirmation remains controlled by authorized staff until the automated process is formally approved.

## Inventory Context

Known 2026 inventory figures:

- 169 accommodation units;
- 407 official beds;
- 484 maximum capacity including approved additional capacity.

These figures must be verified against the authoritative inventory source before production migration.

## Development Governance

- `main` is the stable branch.
- `develop` is the integration branch.
- Changes must use `feature/*` or `fix/*` branches.
- No direct unreviewed production changes.
- Claude Code is the primary implementation agent.
- Codex is the independent QA and security reviewer.
- ChatGPT defines architecture, tasks, priorities, acceptance criteria, and final PASS/FAIL.
- Every implementation stage must include a written task and a written report.
- Do not expose secrets.
- Do not modify external production services without owner approval.
- Do not introduce new tools, services, containers, or public ports without owner approval.

## Recommended Sequence

1. Establish Git baseline.
2. Install dependencies using the lockfile.
3. Run lint, typecheck, build, and dependency audit.
4. Document current Google Sheets CRM schema and integration.
5. Design Supabase schema, roles, and row-level security.
6. Implement production authentication and authorization.
7. Migrate room inventory and booking core.
8. Implement real date-based availability and overbooking protection.
9. Implement payments and booking confirmation workflow.
10. Implement housekeeping, inspection, maintenance, and technical blocking.
11. Build role-specific responsive/PWA interfaces.
12. Connect n8n, Telegram alerts, AI assistants, and reporting after the transactional core is stable.
