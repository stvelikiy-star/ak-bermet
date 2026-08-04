-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0014: Room Inspections & Staff Assignments
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0011, 0012, 0013.
--
-- Tables: room_inspections, staff_assignments.
--
-- Both tables reference cleaning_tasks AND maintenance_requests, so
-- neither can be declared before this point in the sequence. They are
-- grouped in one file because they are both cross-cutting workflow
-- tables rather than belonging to cleaning or maintenance specifically:
-- an inspection can follow either workflow, and an assignment can target
-- either task type.
-- =====================================================================

begin;

-- staff_assignments: a single generic assignment table for both
-- cleaning_tasks and maintenance_requests, instead of two near-identical
-- tables (cleaning_task_assignments / maintenance_assignments as
-- originally sketched in AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql Section 8).
-- Reassignment is modeled as history: never update staff_id on an
-- existing row — release it (released_at, status='released') and insert
-- a new row. This is also the sole basis for the RLS policies (0017)
-- that let housekeeping/technician see only their own assigned tasks.
create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  task_type public.assignment_task_type not null,
  cleaning_task_id uuid references public.cleaning_tasks(id) on delete cascade,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete cascade,
  staff_id uuid not null references public.profiles(id),
  assigned_by uuid references public.profiles(id), -- null when self-assigned is not permitted; always set by an admin/manager RPC
  status public.assignment_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (task_type = 'cleaning_task' and cleaning_task_id is not null and maintenance_request_id is null)
    or
    (task_type = 'maintenance_request' and maintenance_request_id is not null and cleaning_task_id is null)
  )
);
create index idx_staff_assignments_staff_active on public.staff_assignments(staff_id)
  where released_at is null;
create index idx_staff_assignments_cleaning on public.staff_assignments(cleaning_task_id)
  where cleaning_task_id is not null;
create index idx_staff_assignments_maintenance on public.staff_assignments(maintenance_request_id)
  where maintenance_request_id is not null;
-- At most one *active* (not yet released) assignment per task, per staff
-- member — prevents accidental duplicate-assignment races while still
-- allowing a full reassignment history.
create unique index uq_staff_assignments_cleaning_active
  on public.staff_assignments(cleaning_task_id)
  where task_type = 'cleaning_task' and released_at is null;
create unique index uq_staff_assignments_maintenance_active
  on public.staff_assignments(maintenance_request_id)
  where task_type = 'maintenance_request' and released_at is null;
comment on table public.staff_assignments is
  '"Housekeeping sees only assigned tasks" / "technician sees only '
  'assigned repair requests" are enforced by 0017''s RLS policies joining '
  'through this table on staff_id = auth.uid() and released_at is null — '
  'not by any application-level filtering. The unique partial indexes '
  'above mean a task has at most one active assignee at a time; a new '
  'INSERT is required to reassign, and the old row must be released '
  'first (see fn_reassign_task in 0016).';

-- room_inspections: administrator/manager sign-off, required before a
-- room following the cleaning workflow can reach 'ready', and also used
-- to re-check a room after a maintenance_request closes.
create table public.room_inspections (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  cleaning_task_id uuid references public.cleaning_tasks(id) on delete set null,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  trigger_reason public.inspection_trigger_reason not null,
  inspected_by uuid not null references public.profiles(id),
  result public.inspection_result not null,
  notes text,
  created_at timestamptz not null default now(),
  check (
    (trigger_reason = 'post_cleaning' and cleaning_task_id is not null)
    or (trigger_reason = 'post_maintenance' and maintenance_request_id is not null)
    or (trigger_reason = 'manual')
  )
);
create index idx_room_inspections_room on public.room_inspections(room_unit_id, created_at);
create index idx_room_inspections_cleaning_task on public.room_inspections(cleaning_task_id)
  where cleaning_task_id is not null;
create index idx_room_inspections_maintenance on public.room_inspections(maintenance_request_id)
  where maintenance_request_id is not null;
comment on table public.room_inspections is
  'Append-only — a failed inspection is never edited to "passed"; a new '
  'passing inspection row is inserted after the room is re-cleaned/'
  're-repaired. fn_transition_room_status (0016) requires the most recent '
  'relevant room_inspections row for the room to have result=''passed'' '
  'before it will allow a transition into ''ready'' from '
  '''inspection_required'' — this is the enforcement of "room becomes '
  'ready only after cleaning and required inspection".';

commit;
