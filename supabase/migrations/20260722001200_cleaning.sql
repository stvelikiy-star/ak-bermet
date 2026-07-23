-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0012: Cleaning
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on Phase 1 0001-0010 and 0011.
--
-- Tables: cleaning_tasks, cleaning_task_history.
-- Assignment (who is cleaning) lives in the shared staff_assignments
-- table (0014), not here, because the identical shape is needed for
-- maintenance_requests and declaring it once avoids two near-duplicate
-- tables.
-- =====================================================================

begin;

-- cleaning_tasks: created automatically on checkout (see 0016's
-- fn_checkout_creates_cleaning_task) or manually by an administrator/
-- manager for an ad hoc clean. Drives room_units.operational_status
-- through fn_transition_room_status (0016) — never updated directly.
create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  task_number text not null unique,
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  status public.cleaning_task_status not null default 'pending',
  requires_inspection boolean not null default true,
  reported_problem text,
  due_by timestamptz,
  created_by uuid references public.profiles(id), -- null when system-generated on checkout
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and accepted_at is null and started_at is null and completed_at is null)
    or status <> 'pending'
  ),
  check (completed_at is null or started_at is not null)
);
create trigger trg_cleaning_tasks_updated_at before update on public.cleaning_tasks
  for each row execute function public.set_updated_at();
create index idx_cleaning_tasks_room on public.cleaning_tasks(room_unit_id);
create index idx_cleaning_tasks_booking on public.cleaning_tasks(booking_id) where booking_id is not null;
create index idx_cleaning_tasks_open on public.cleaning_tasks(status)
  where status not in ('done', 'cancelled');
comment on table public.cleaning_tasks is
  'Task_number format CLN-YYYY-NNNNNN via generate_public_number() (Phase '
  '1 0001). status is only ever changed through the fn_accept_cleaning_task '
  '/ fn_start_cleaning_task / fn_complete_cleaning_task / '
  'fn_report_cleaning_problem RPCs in 0016, which also drive '
  'room_units.operational_status and cleaning_task_history together, so '
  'the two never drift out of sync.';

create or replace function public.set_cleaning_task_number()
returns trigger language plpgsql as $$
begin
  new.task_number := public.generate_public_number('CLN', 'cleaning_task_number_seq');
  return new;
end;
$$;
create trigger trg_cleaning_tasks_public_number before insert on public.cleaning_tasks
  for each row when (new.task_number is null)
  execute procedure public.set_cleaning_task_number();

-- cleaning_task_history: append-only status trail, same pattern as Phase
-- 1's booking_status_history / lead_status_history. This is the primary
-- read path for "what happened to this specific cleaning task and when";
-- audit_log (0007, Phase 1) remains the generic catch-all and is also
-- attached to this table in 0016 for full-row before/after capture.
create table public.cleaning_task_history (
  id uuid primary key default gen_random_uuid(),
  cleaning_task_id uuid not null references public.cleaning_tasks(id) on delete cascade,
  status public.cleaning_task_status not null,
  changed_by uuid references public.profiles(id), -- null for system-triggered transitions
  comment text,
  created_at timestamptz not null default now()
);
create index idx_cleaning_task_history_task on public.cleaning_task_history(cleaning_task_id, created_at);

create or replace function public.log_cleaning_task_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.cleaning_task_history (cleaning_task_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_cleaning_tasks_history
  after insert or update of status on public.cleaning_tasks
  for each row execute function public.log_cleaning_task_status_change();

commit;
