# AK BERMET Supabase Architecture Design

## Status

APPROVED

## Objective

Design the production Supabase/PostgreSQL architecture for AK BERMET using:

- the current Next.js project;
- the existing Google Sheets CRM;
- the approved booking rules;
- the approved room inventory model;
- the approved operational CRM for housekeeping, inspection, maintenance, and technical blocking.

This task is architecture-only.

## Mandatory Restrictions

Do not:

- create or modify a Supabase project;
- execute SQL;
- run migrations;
- modify project source files;
- modify Google Sheets;
- expose secrets;
- install dependencies;
- create commits;
- push;
- merge;
- deploy;
- modify external services.

## Current Google Sheets CRM

Spreadsheet:

`AK BERMET CRM 2026`

Confirmed worksheets:

- `Сообщения`
- `Логи ошибок`
- `Заявки`
- `Номерной фонд`
- `Занятость`
- `Оплаты`
- `Услуги и цены`
- `FAQ база AI`
- `История заявок`
- `Справочники`
- `Дашборд`

Google Sheets is the current MVP CRM and must remain available during migration.

The future architecture must use Supabase as the transactional source of truth and Google Sheets as a controlled reporting/export layer.

## Core Business Context

Known inventory:

- 169 accommodation units;
- 407 official beds;
- 484 maximum capacity including approved extra places.

Known object breakdown:

- Corpus 1: 24 units / 55 official beds;
- Garden 1: 16 / 32;
- Garden 2: 16 / 32;
- Corpus 2: 28 / 68;
- Corpus 3: 27 / 63;
- Corpus 4: 22 / 54;
- Brick Cottage: 14 / 35;
- Log House: 22 / 45.

Known rules:

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
- even-numbered rooms face the preferred/nature view;
- odd-numbered rooms face the service/yard/fence side;
- availability must prevent overlapping bookings;
- authorized staff control final confirmation until automation is formally approved.

## Required Roles

Design for:

- owner;
- administrator;
- manager;
- housekeeping;
- technician.

Each user must have a personal account.

## Required Operational States

The room operational state model must support:

- `checkout_pending`;
- `cleaning_required`;
- `cleaning_in_progress`;
- `inspection_required`;
- `ready`;
- `maintenance_required`;
- `maintenance_in_progress`;
- `blocked`.

## Required Entities

Design normalized tables for at least:

### Identity and access

- profiles;
- roles;
- user_roles;
- staff assignments;
- sessions or Supabase Auth integration assumptions.

### CRM and communication

- customers;
- leads;
- lead_contacts;
- messages;
- message_media;
- lead_status_history;
- tasks/follow-ups;
- error_logs.

### Inventory

- properties or resort;
- buildings;
- room_categories;
- room_units;
- bed configurations;
- extra-capacity rules;
- room amenities;
- room photos;
- room pricing periods;
- room blocks.

### Booking

- bookings;
- booking_guests;
- booking_rooms;
- booking_status_history;
- availability holds;
- occupancy periods;
- booking price components;
- booking services;
- cancellation records.

### Payments

- payments;
- payment_receipts;
- refunds;
- payment_status_history.

### Operational CRM

- cleaning_tasks;
- cleaning_task_assignments;
- cleaning_photos;
- inspections;
- maintenance_requests;
- maintenance_assignments;
- maintenance_materials;
- maintenance_photos;
- room_operational_status_history.

### AI and knowledge

- faq_entries;
- service_catalog;
- service_prices;
- dictionaries/reference values;
- AI conversation state if required.

### Integration and audit

- integration_events;
- Google Sheets synchronization queue;
- synchronization history;
- audit_log.

## Required Database Design

For every table define:

- purpose;
- columns;
- PostgreSQL type;
- primary key;
- foreign keys;
- unique constraints;
- check constraints;
- indexes;
- soft-delete policy;
- created/updated timestamps;
- audit requirements;
- Google Sheets source mapping;
- migration priority.

Use UUID primary keys where appropriate.

Use separate human-readable public identifiers for business objects such as:

- lead number;
- booking number;
- payment number;
- task number.

## Booking Integrity Requirements

Design database-level protection for:

- overlapping room bookings;
- overlapping availability holds;
- technical room blocks;
- maintenance blocks;
- stop-sale periods;
- cancelled/expired holds;
- booking confirmation races;
- payment-to-booking consistency.

Recommend the correct PostgreSQL approach, including exclusion constraints or transaction-safe alternatives.

## Room Inventory Requirements

The model must distinguish:

- room category;
- physical room unit;
- building;
- floor;
- room number;
- odd/even view rule;
- official beds;
- maximum capacity;
- extra places;
- bed configuration;
- active/sellable status;
- operational status;
- maintenance/technical blocking.

## Operational Workflow Requirements

Design state transitions and permissions for:

### Checkout to readiness

1. Guest checkout.
2. Room becomes `checkout_pending`.
3. Cleaning task is created.
4. Room becomes `cleaning_required`.
5. Housekeeping accepts task.
6. Room becomes `cleaning_in_progress`.
7. Cleaning is completed.
8. Room becomes `inspection_required` when inspection is required.
9. Administrator approves.
10. Room becomes `ready`.

### Maintenance

1. Problem reported.
2. Maintenance request created.
3. Room becomes `maintenance_required` or `blocked`.
4. Technician accepts.
5. Room becomes `maintenance_in_progress`.
6. Work and materials are recorded.
7. Result photos are attached.
8. Authorized user closes the request.
9. Room returns to inspection or ready according to policy.

## Row-Level Security

Design RLS policies for:

- owner;
- administrator;
- manager;
- housekeeping;
- technician;
- public website;
- server-side integration service.

Housekeeping must only see assigned tasks and required room data.

Technicians must only see assigned or permitted maintenance requests.

Managers must not receive owner-only financial or system-administration access unless explicitly granted.

Do not use broad public policies.

## Google Sheets Migration and Synchronization

Define:

- source-to-target mapping;
- import order;
- ID reconciliation;
- test-data handling;
- duplicate handling;
- phone normalization;
- date normalization;
- status mapping;
- rollback strategy;
- shadow-read phase;
- dual-write risks;
- cutover strategy.

Recommended direction after cutover:

`Supabase -> Google Sheets`

Any reverse synchronization must be explicitly controlled and audited.

## Required Deliverables

Write the architecture report to:

`/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN_REPORT.md`

Also write a draft SQL schema, but do not execute it:

`/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql`

The report must include:

1. Executive summary
2. Architecture principles
3. Current Google Sheets mapping
4. Target entity model
5. Table-by-table specification
6. Relationships
7. Booking integrity model
8. Room inventory model
9. Operational CRM model
10. Authentication and roles
11. RLS design
12. Audit and history model
13. File/photo storage model
14. Google Sheets synchronization model
15. Migration sequence
16. Test-data cleanup plan
17. Rollback plan
18. Risks
19. Recommended implementation phases
20. Final PASS or FAIL for implementation readiness

## PASS Criteria

Return PASS only when:

- the architecture covers current CRM data;
- all 169 physical units can be represented;
- booking overlap prevention is defined;
- operational CRM workflows are defined;
- roles and RLS are defined;
- Google Sheets migration is defined;
- the SQL draft is internally consistent;
- no external system was changed.

## Completion Output

Print only:

- report path;
- SQL draft path;
- final PASS or FAIL;
- proposed table count;
- critical architecture issue count;
- recommended first implementation task;
- confirmation that no project files, databases, Google Sheets, branches, remotes, or deployments were changed.
