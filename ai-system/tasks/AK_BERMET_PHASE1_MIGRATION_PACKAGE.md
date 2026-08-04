# AK BERMET Phase 1 Migration Package

## Status

APPROVED

## Objective

Prepare a production-ready, non-executed Supabase/PostgreSQL Phase 1 migration package using:

- `/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN_REPORT.md`
- `/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql`
- the current AK BERMET project context.

This task creates SQL and documentation files only.

## Mandatory Restrictions

Do not:

- execute SQL;
- connect to or modify Supabase;
- run migrations;
- modify Google Sheets;
- modify AK BERMET source code;
- expose secrets;
- install dependencies;
- create commits;
- push or merge;
- deploy;
- modify external services;
- import real customer data.

## Phase 1 Scope

Prepare migrations for:

### Foundation

- PostgreSQL extensions;
- enums;
- helper functions;
- updated-at triggers;
- public identifier generation;
- audit helpers.

### Identity and roles

- profiles;
- roles;
- user_roles;
- staff assignments;
- Supabase Auth integration assumptions.

### Inventory

- properties;
- buildings;
- room_categories;
- room_units;
- bed configurations;
- extra-capacity rules;
- room amenities;
- room blocks.

### CRM foundation

- customers;
- leads;
- lead status history.

### Booking integrity

- bookings;
- booking_rooms;
- booking status history;
- availability_holds;
- occupancy_periods.

### Audit and integration

- audit_log;
- integration_events;
- Google Sheets synchronization queue;
- synchronization history.

## Integrity Requirements

Protect against:

- invalid booking date ranges;
- duplicate public identifiers;
- overlapping confirmed bookings;
- overlapping active holds;
- technical blocks;
- maintenance blocks;
- stop-sale periods;
- expired holds;
- confirmation race conditions.

Use appropriate PostgreSQL mechanisms, including:

- `btree_gist`;
- range types;
- exclusion constraints;
- partial indexes;
- check constraints;
- unique constraints;
- transaction-safe functions.

## RLS Requirements

Prepare explicit policies for:

- owner;
- administrator;
- manager;
- housekeeping;
- technician;
- public website;
- server-side integration role.

Do not create broad anonymous access.

Housekeeping and technician access should remain minimal even if their operational tables are introduced in later phases.

## Required Package

Create:

`/home/agent/ai-prof-stack/ai-system/reports/ak-bermet-phase1-migrations/`

Required files:

1. `0001_extensions_and_enums.sql`
2. `0002_identity_and_roles.sql`
3. `0003_inventory.sql`
4. `0004_customers_leads.sql`
5. `0005_booking_core.sql`
6. `0006_booking_integrity.sql`
7. `0007_audit_and_integrations.sql`
8. `0008_rls_policies.sql`
9. `0009_seed_reference_data.sql`
10. `0010_validation_queries.sql`
11. `ROLLBACK.sql`
12. `README.md`

## Seed Restrictions

Seed only safe reference data:

- roles;
- booking statuses;
- room operational statuses;
- approved reference values.

Do not insert real customers, phones, emails, bookings, payments, staff accounts, or credentials.

## Validation SQL

Prepare non-destructive validation queries for:

- extensions;
- tables;
- keys;
- foreign keys;
- indexes;
- exclusion constraints;
- RLS;
- policies;
- role seeds;
- invalid dates;
- duplicate identifiers;
- booking overlap prevention;
- hold overlap prevention;
- room-block prevention;
- expired holds;
- audit triggers.

Do not execute validation SQL.

## Rollback

Provide:

- dependency-safe rollback order;
- development rollback procedure;
- production rollback warnings;
- backup/export prerequisites;
- objects that must not be dropped when real data exists.

## Required Report

Write:

`/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_PHASE1_MIGRATION_PACKAGE_REPORT.md`

Include:

1. Executive summary
2. Source architecture reviewed
3. Migration file inventory
4. Phase 1 tables
5. Constraints and indexes
6. Booking overlap protection
7. Hold expiration model
8. Room block model
9. RLS summary
10. Seed-data summary
11. Validation strategy
12. Rollback strategy
13. Supabase prerequisites
14. Known risks
15. Manual approval points
16. Recommended execution order
17. Final PASS or FAIL

## PASS Criteria

Return PASS only when:

- all 12 package files exist;
- SQL dependency order is valid;
- booking and hold overlap protection is defined;
- room blocks are enforced;
- RLS is explicit;
- validation SQL is complete;
- rollback is documented;
- no SQL was executed;
- no project or external system was changed.

## Completion Output

Print only:

- report path;
- migration package path;
- final PASS or FAIL;
- migration file count;
- Phase 1 table count;
- critical issue count;
- recommended next step;
- confirmation that no SQL, Supabase, Google Sheets, Git, source-code, or deployment changes occurred.
