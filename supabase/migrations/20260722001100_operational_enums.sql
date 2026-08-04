-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0011: Operational Enums
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED.
-- Produced under the AK BERMET Phase 2 Operational CRM architecture task.
-- No statement in this file (or any file in this package) has been run
-- against any database.
--
-- Foundation this package builds on (already APPROVED and PREPARED, not
-- executed):
--   - ai-system/tasks/AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN.md
--   - ai-system/reports/AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql (Section 8)
--   - ai-system/reports/ak-bermet-phase1-migrations/0001-0010
--
-- Phase 1 already declares public.room_operational_status (the 8-state
-- model) and public.room_block_type in 0001_extensions_and_enums.sql,
-- because room_units carries the operational_status column from day one.
-- This file does NOT redeclare either type — it only adds the enums that
-- are new in Phase 2: the operational-CRM workflow vocabulary for
-- cleaning, maintenance, inspection, assignment, attachment, and
-- notification tables.
--
-- Apply order: 0011 -> 0012 -> ... -> 0017. 0018 is read-only validation.
-- Down-migration: see ROLLBACK.sql (reverse order).
-- Depends on: Phase 1 0001-0010 (specifically: public.room_operational_status,
-- public.room_block_type, public.profiles, public.room_units,
-- public.room_blocks, public.bookings, public.booking_rooms,
-- public.audit_log, public.has_role(), public.is_staff(),
-- public.set_updated_at(), public.generate_public_number()).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Cleaning workflow
-- ---------------------------------------------------------------------

create type public.cleaning_task_status as enum (
  'pending',          -- created (usually by checkout), not yet accepted
  'accepted',         -- housekeeping accepted, not yet started
  'in_progress',      -- cleaning under way
  'problem_reported', -- housekeeping flagged an issue mid-task (may spawn a maintenance_request)
  'done',             -- cleaning finished, awaiting inspection if required
  'cancelled'         -- task voided (e.g. booking cancelled before checkout completed)
);

-- ---------------------------------------------------------------------
-- Maintenance workflow
-- ---------------------------------------------------------------------

create type public.maintenance_priority as enum ('low', 'normal', 'high', 'urgent');

create type public.maintenance_status as enum (
  'reported',      -- ticket opened, not yet assigned
  'acknowledged',  -- technician assigned/accepted, not yet started
  'in_progress',   -- diagnosis/repair under way
  'on_hold',       -- waiting on parts/access/approval
  'completed',     -- repair work finished, not yet formally closed
  'closed',        -- authorized user closed the ticket (room status decided)
  'cancelled'      -- ticket voided (duplicate, false report)
);

create type public.work_log_type as enum (
  'diagnosis',       -- technician's diagnosis of the reported problem
  'work_performed',  -- a discrete unit of repair work
  'material_used',   -- a part/material consumed (paired with quantity/cost)
  'note'             -- free-form progress note
);

-- ---------------------------------------------------------------------
-- Inspection workflow
-- ---------------------------------------------------------------------

-- NOTE: public.inspection_result ('passed', 'failed') already exists in
-- the approved AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql Section 8 vocabulary
-- and is declared fresh here since Phase 1 did not create it (inspections
-- were explicitly out of Phase 1 scope).
create type public.inspection_result as enum ('passed', 'failed');

create type public.inspection_trigger_reason as enum (
  'post_cleaning',    -- required sign-off after a cleaning_task
  'post_maintenance', -- required sign-off after a maintenance_request closes
  'manual'            -- ad hoc spot-check, not tied to a specific task
);

-- ---------------------------------------------------------------------
-- Assignment (shared by cleaning_tasks and maintenance_requests)
-- ---------------------------------------------------------------------

create type public.assignment_task_type as enum ('cleaning_task', 'maintenance_request');

create type public.assignment_status as enum (
  'assigned',   -- staff notified, not yet responded
  'accepted',   -- staff accepted the assignment
  'declined',   -- staff declined (reassignment expected)
  'released',   -- assignment closed out (task completed or reassigned)
  'completed'   -- staff completed their portion of the task
);

-- ---------------------------------------------------------------------
-- Attachments (shared by cleaning_tasks, maintenance_requests, room_inspections)
-- ---------------------------------------------------------------------

create type public.attachment_entity_type as enum (
  'cleaning_task', 'maintenance_request', 'room_inspection'
);

create type public.attachment_phase as enum (
  'before',      -- housekeeping before-photo
  'after',       -- housekeeping after-photo
  'diagnostic',  -- technician photo taken while diagnosing
  'result',      -- technician result/evidence photo after repair
  'other'
);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------

create type public.operational_notification_type as enum (
  'cleaning_task_assigned',
  'cleaning_task_problem_reported',
  'inspection_required',
  'inspection_failed',
  'maintenance_assigned',
  'maintenance_blocked',
  'maintenance_completed',
  'room_ready'
);

-- ---------------------------------------------------------------------
-- Public identifier sequences (same pattern as Phase 1's
-- lead_number_seq/booking_number_seq — consumed by
-- public.generate_public_number(), declared in Phase 1 0001).
-- ---------------------------------------------------------------------

create sequence if not exists public.cleaning_task_number_seq;
create sequence if not exists public.maintenance_request_number_seq;

commit;
