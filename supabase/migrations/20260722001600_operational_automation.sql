-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0016: Operational Automation
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0011-0015 and Phase 1
-- 0001-0010.
--
-- This file is the Phase 2 analogue of Phase 1's 0006_booking_integrity.sql:
-- it is where the required *behavior* lives, not just the schema. It
-- implements, in order:
--   1. The room_status_transitions graph + fn_transition_room_status(),
--      the single gate through which room_units.operational_status is
--      ever allowed to change.
--   2. "Checkout creates cleaning task" (fn_checkout_creates_cleaning_task,
--      trigger on bookings).
--   3. Housekeeping RPCs: accept, start, complete, report problem
--      (with before/after photos going through task_attachments directly,
--      no RPC needed for uploads — see 0017's task_attachments policy).
--   4. Technician RPCs: accept, start, record work/materials/diagnosis,
--      complete work, and the separate authorized-close step.
--   5. Assignment dispatch (fn_assign_staff) and notification helpers.
--   6. fn_record_room_inspection() — the "administrator approves" /
--      post-maintenance sign-off step, the only writer of room_inspections.
--   7. Extending Phase 1's fn_audit_row_change() coverage to the new
--      operational tables.
--
-- Every RPC below is SECURITY DEFINER but re-checks the caller's role and
-- assignment ownership itself (via auth.uid()) before doing anything —
-- SECURITY DEFINER here is used only to reach tables the caller has no
-- direct grant on (room_units.operational_status, room_status_history,
-- audit_log-style tables), never to skip authorization logic.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Room status state machine
-- ---------------------------------------------------------------------

create table public.room_status_transitions (
  from_status public.room_operational_status not null,
  to_status public.room_operational_status not null,
  primary key (from_status, to_status)
);
comment on table public.room_status_transitions is
  'The complete legal-transition graph for the 8-state model. Read-only '
  'reference data, seeded once below by this migration (structural '
  'configuration, not business/customer data — same category as Phase '
  '1''s roles/buildings seed rows). fn_transition_room_status() is the '
  'only code path that consults this table.';

insert into public.room_status_transitions (from_status, to_status) values
  -- Checkout -> cleaning -> inspection -> ready (the primary turnover path)
  ('checkout_pending',      'cleaning_required'),
  ('cleaning_required',     'cleaning_in_progress'),
  ('cleaning_in_progress',  'inspection_required'),
  ('cleaning_in_progress',  'ready'),            -- only when the task's requires_inspection = false; guarded in the function below
  ('inspection_required',   'ready'),            -- only with a passed room_inspections row; guarded below
  ('inspection_required',   'cleaning_required'),-- failed inspection -> re-clean
  ('ready',                 'checkout_pending'), -- next guest's checkout
  -- Maintenance path
  ('maintenance_required',  'maintenance_in_progress'),
  ('maintenance_in_progress','inspection_required'),
  ('maintenance_in_progress','ready'),
  ('maintenance_in_progress','blocked'),
  ('blocked',               'maintenance_in_progress'),
  ('blocked',               'inspection_required'),
  ('blocked',               'ready'),
  -- Any operational state can degrade into maintenance_required (problem reported)
  ('checkout_pending',      'maintenance_required'),
  ('cleaning_required',     'maintenance_required'),
  ('cleaning_in_progress',  'maintenance_required'),
  ('inspection_required',   'maintenance_required'),
  ('ready',                 'maintenance_required'),
  ('blocked',               'maintenance_required'),
  -- Any operational state can escalate directly into blocked (severe technical block)
  ('checkout_pending',      'blocked'),
  ('cleaning_required',     'blocked'),
  ('cleaning_in_progress',  'blocked'),
  ('inspection_required',   'blocked'),
  ('ready',                 'blocked'),
  ('maintenance_required',  'blocked');

create or replace function public.fn_transition_room_status(
  p_room_unit_id uuid,
  p_new_status public.room_operational_status,
  p_cleaning_task_id uuid default null,
  p_maintenance_request_id uuid default null,
  p_room_inspection_id uuid default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.room_operational_status;
  v_requires_inspection boolean;
  v_last_result public.inspection_result;
begin
  select operational_status into v_current
    from public.room_units where id = p_room_unit_id
    for update;

  if not found then
    raise exception 'fn_transition_room_status: room_unit % does not exist', p_room_unit_id;
  end if;

  if v_current = p_new_status then
    return; -- idempotent no-op
  end if;

  if not exists (
    select 1 from public.room_status_transitions
    where from_status = v_current and to_status = p_new_status
  ) then
    raise exception 'fn_transition_room_status: illegal transition % -> % for room %',
      v_current, p_new_status, p_room_unit_id;
  end if;

  -- Guard: cleaning_in_progress -> ready is only legal when the cleaning
  -- task explicitly does not require inspection.
  if v_current = 'cleaning_in_progress' and p_new_status = 'ready' then
    if p_cleaning_task_id is null then
      raise exception 'fn_transition_room_status: cleaning_in_progress -> ready requires a cleaning_task_id';
    end if;
    select requires_inspection into v_requires_inspection
      from public.cleaning_tasks where id = p_cleaning_task_id;
    if coalesce(v_requires_inspection, true) then
      raise exception 'fn_transition_room_status: room % requires inspection before ready', p_room_unit_id;
    end if;
  end if;

  -- Guard: inspection_required -> ready requires the most recent relevant
  -- room_inspections row (for this room) to have passed. This is the
  -- enforcement of "room becomes ready only after cleaning and required
  -- inspection".
  if v_current = 'inspection_required' and p_new_status = 'ready' then
    select result into v_last_result
      from public.room_inspections
      where room_unit_id = p_room_unit_id
      order by created_at desc
      limit 1;
    if v_last_result is distinct from 'passed' then
      raise exception 'fn_transition_room_status: room % has no passed inspection on record', p_room_unit_id;
    end if;
  end if;

  update public.room_units
    set operational_status = p_new_status
    where id = p_room_unit_id;

  insert into public.room_status_history (
    room_unit_id, previous_status, status, changed_by,
    cleaning_task_id, maintenance_request_id, room_inspection_id, note
  ) values (
    p_room_unit_id, v_current, p_new_status, auth.uid(),
    p_cleaning_task_id, p_maintenance_request_id, p_room_inspection_id, p_note
  );
end;
$$;
revoke execute on function public.fn_transition_room_status(
  uuid, public.room_operational_status, uuid, uuid, uuid, text
) from public;
comment on function public.fn_transition_room_status is
  'The sole path by which room_units.operational_status changes. Not '
  'granted to authenticated/anon directly — only callable from the other '
  'SECURITY DEFINER functions in this file, which perform their own '
  'role/assignment checks first. See 0017 for why room_units_staff_write '
  '(Phase 1) intentionally still allows owner/administrator a direct '
  'UPDATE path for manual corrections, bypassing this function''s history '
  'logging — a documented, audited-elsewhere exception, not an oversight.';

-- ---------------------------------------------------------------------
-- 2. Notification helpers
-- ---------------------------------------------------------------------

create or replace function public.fn_notify_role(
  p_role public.role_name,
  p_type public.operational_notification_type,
  p_title text,
  p_body text,
  p_related_table text,
  p_related_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.operational_notifications
    (recipient_id, notification_type, title, body, related_table, related_id)
  select ur.user_id, p_type, p_title, p_body, p_related_table, p_related_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = p_role and ur.deleted_at is null;
end;
$$;
revoke execute on function public.fn_notify_role(
  public.role_name, public.operational_notification_type, text, text, text, uuid
) from public;

create or replace function public.fn_notify_user(
  p_user_id uuid,
  p_type public.operational_notification_type,
  p_title text,
  p_body text,
  p_related_table text,
  p_related_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.operational_notifications
    (recipient_id, notification_type, title, body, related_table, related_id)
  values (p_user_id, p_type, p_title, p_body, p_related_table, p_related_id);
end;
$$;
revoke execute on function public.fn_notify_user(
  uuid, public.operational_notification_type, text, text, text, uuid
) from public;

create or replace function public.fn_mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.operational_notifications
    set is_read = true, read_at = now()
    where id = p_notification_id and recipient_id = auth.uid() and is_read = false;
end;
$$;
grant execute on function public.fn_mark_notification_read(uuid) to authenticated;
comment on function public.fn_mark_notification_read is
  'The only write path to operational_notifications available to a '
  'recipient — no direct UPDATE policy is granted in 0017, so a staff '
  'member can flip is_read on their own rows but cannot rewrite title, '
  'body, or notification_type.';

-- ---------------------------------------------------------------------
-- 3. Checkout creates cleaning task
-- ---------------------------------------------------------------------

create or replace function public.fn_checkout_creates_cleaning_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_task_id uuid;
begin
  for v_room in
    select br.room_unit_id
    from public.booking_rooms br
    where br.booking_id = new.id and br.status = 'active'
  loop
    perform public.fn_transition_room_status(
      v_room.room_unit_id, 'checkout_pending',
      p_note => 'automatic: guest checkout'
    );

    insert into public.cleaning_tasks (room_unit_id, booking_id, created_by)
    values (v_room.room_unit_id, new.id, null)
    returning id into v_task_id;

    perform public.fn_transition_room_status(
      v_room.room_unit_id, 'cleaning_required',
      p_cleaning_task_id => v_task_id,
      p_note => 'automatic: cleaning task ' || v_task_id || ' created on checkout'
    );
  end loop;

  return new;
end;
$$;
create trigger trg_bookings_checkout_creates_cleaning
  after update of status on public.bookings
  for each row
  when (new.status = 'checked_out' and old.status is distinct from new.status)
  execute function public.fn_checkout_creates_cleaning_task();
comment on trigger trg_bookings_checkout_creates_cleaning on public.bookings is
  'Implements "checkout creates cleaning task". One cleaning_tasks row per '
  'active booking_rooms entry — a multi-room booking produces one task '
  'per physical room, since housekeeping assignment and cleaning progress '
  'are tracked per room, not per booking.';

-- ---------------------------------------------------------------------
-- 4. Assignment dispatch (owner/administrator/manager only)
-- ---------------------------------------------------------------------

create or replace function public.fn_assign_staff(
  p_task_type public.assignment_task_type,
  p_task_id uuid,
  p_staff_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required_role public.role_name;
  v_room_unit_id uuid;
  v_assignment_id uuid;
  v_notif_type public.operational_notification_type;
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'fn_assign_staff: caller is not authorized to dispatch assignments';
  end if;

  v_required_role := case p_task_type
    when 'cleaning_task' then 'housekeeping'::public.role_name
    else 'technician'::public.role_name
  end;

  if not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_staff_id and r.name = v_required_role and ur.deleted_at is null
  ) then
    raise exception 'fn_assign_staff: staff % does not hold role %', p_staff_id, v_required_role;
  end if;

  if p_task_type = 'cleaning_task' then
    select room_unit_id into v_room_unit_id from public.cleaning_tasks where id = p_task_id;
    update public.staff_assignments
      set status = 'released', released_at = now()
      where cleaning_task_id = p_task_id and released_at is null;
    insert into public.staff_assignments (task_type, cleaning_task_id, staff_id, assigned_by)
    values ('cleaning_task', p_task_id, p_staff_id, auth.uid())
    returning id into v_assignment_id;
    v_notif_type := 'cleaning_task_assigned';
  else
    select room_unit_id into v_room_unit_id from public.maintenance_requests where id = p_task_id;
    update public.staff_assignments
      set status = 'released', released_at = now()
      where maintenance_request_id = p_task_id and released_at is null;
    insert into public.staff_assignments (task_type, maintenance_request_id, staff_id, assigned_by)
    values ('maintenance_request', p_task_id, p_staff_id, auth.uid())
    returning id into v_assignment_id;
    v_notif_type := 'maintenance_assigned';
  end if;

  perform public.fn_notify_user(
    p_staff_id, v_notif_type,
    case when p_task_type = 'cleaning_task' then 'New cleaning task assigned' else 'New maintenance request assigned' end,
    'Room: ' || v_room_unit_id,
    case when p_task_type = 'cleaning_task' then 'cleaning_tasks' else 'maintenance_requests' end,
    p_task_id
  );

  return v_assignment_id;
end;
$$;
grant execute on function public.fn_assign_staff(public.assignment_task_type, uuid, uuid) to authenticated;
comment on function public.fn_assign_staff is
  'Dispatch is a management action, not self-service: only owner/'
  'administrator/manager may call this. Re-running it for a task that '
  'already has an active assignee releases the old assignment (history '
  'preserved via the released row, per staff_assignments'' comment) and '
  'creates a new one — this is also how reassignment works, no separate '
  'RPC is needed.';

-- ---------------------------------------------------------------------
-- 5. Housekeeping RPCs — accept, start, complete, report problem
-- ---------------------------------------------------------------------

create or replace function public.fn_accept_cleaning_task(p_cleaning_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff_assignments
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_accept_cleaning_task: caller is not the assigned housekeeping staff for task %', p_cleaning_task_id;
  end if;

  update public.staff_assignments
    set status = 'accepted', accepted_at = now()
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null;

  update public.cleaning_tasks
    set status = 'accepted', accepted_at = now()
    where id = p_cleaning_task_id and status = 'pending';
end;
$$;
grant execute on function public.fn_accept_cleaning_task(uuid) to authenticated;

create or replace function public.fn_start_cleaning_task(p_cleaning_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_unit_id uuid;
begin
  if not exists (
    select 1 from public.staff_assignments
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_start_cleaning_task: caller is not the assigned housekeeping staff for task %', p_cleaning_task_id;
  end if;

  select room_unit_id into v_room_unit_id from public.cleaning_tasks
    where id = p_cleaning_task_id and status = 'accepted';
  if v_room_unit_id is null then
    raise exception 'fn_start_cleaning_task: task % is not in accepted status', p_cleaning_task_id;
  end if;

  update public.cleaning_tasks
    set status = 'in_progress', started_at = now()
    where id = p_cleaning_task_id;

  perform public.fn_transition_room_status(
    v_room_unit_id, 'cleaning_in_progress',
    p_cleaning_task_id => p_cleaning_task_id,
    p_note => 'housekeeping started cleaning'
  );
end;
$$;
grant execute on function public.fn_start_cleaning_task(uuid) to authenticated;

create or replace function public.fn_complete_cleaning_task(p_cleaning_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
begin
  select * into v_task from public.cleaning_tasks where id = p_cleaning_task_id;

  if not exists (
    select 1 from public.staff_assignments
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_complete_cleaning_task: caller is not the assigned housekeeping staff for task %', p_cleaning_task_id;
  end if;
  if v_task.status <> 'in_progress' then
    raise exception 'fn_complete_cleaning_task: task % is not in_progress', p_cleaning_task_id;
  end if;

  update public.cleaning_tasks
    set status = 'done', completed_at = now()
    where id = p_cleaning_task_id;

  update public.staff_assignments
    set status = 'completed', completed_at = now(), released_at = now()
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null;

  if v_task.requires_inspection then
    perform public.fn_transition_room_status(
      v_task.room_unit_id, 'inspection_required',
      p_cleaning_task_id => p_cleaning_task_id,
      p_note => 'cleaning complete, inspection required'
    );
    perform public.fn_notify_role(
      'administrator', 'inspection_required',
      'Room ready for inspection', 'Room: ' || v_task.room_unit_id,
      'cleaning_tasks', p_cleaning_task_id
    );
  else
    perform public.fn_transition_room_status(
      v_task.room_unit_id, 'ready',
      p_cleaning_task_id => p_cleaning_task_id,
      p_note => 'cleaning complete, no inspection required'
    );
    perform public.fn_notify_role(
      'administrator', 'room_ready',
      'Room ready', 'Room: ' || v_task.room_unit_id,
      'cleaning_tasks', p_cleaning_task_id
    );
  end if;
end;
$$;
grant execute on function public.fn_complete_cleaning_task(uuid) to authenticated;

create or replace function public.fn_report_cleaning_problem(
  p_cleaning_task_id uuid,
  p_note text,
  p_blocks_room boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_unit_id uuid;
  v_request_id uuid;
  v_block_id uuid;
begin
  select room_unit_id into v_room_unit_id from public.cleaning_tasks
    where id = p_cleaning_task_id;

  if not exists (
    select 1 from public.staff_assignments
    where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_report_cleaning_problem: caller is not the assigned housekeeping staff for task %', p_cleaning_task_id;
  end if;

  update public.cleaning_tasks
    set status = 'problem_reported', reported_problem = p_note
    where id = p_cleaning_task_id;

  insert into public.maintenance_requests
    (room_unit_id, cleaning_task_id, reported_by, description, blocks_room)
  values (v_room_unit_id, p_cleaning_task_id, auth.uid(), p_note, p_blocks_room)
  returning id into v_request_id;

  if p_blocks_room then
    insert into public.room_blocks
      (room_unit_id, block_type, date_range, reason, created_by, maintenance_request_id)
    values (v_room_unit_id, 'maintenance', daterange(current_date, null, '[)'), p_note, auth.uid(), v_request_id)
    returning id into v_block_id;

    perform public.fn_transition_room_status(
      v_room_unit_id, 'blocked',
      p_maintenance_request_id => v_request_id,
      p_note => 'blocked: problem reported during cleaning'
    );
  else
    perform public.fn_transition_room_status(
      v_room_unit_id, 'maintenance_required',
      p_maintenance_request_id => v_request_id,
      p_note => 'maintenance required: problem reported during cleaning'
    );
  end if;

  perform public.fn_notify_role(
    'administrator', 'cleaning_task_problem_reported',
    'Problem reported during cleaning', p_note,
    'maintenance_requests', v_request_id
  );

  return v_request_id;
end;
$$;
grant execute on function public.fn_report_cleaning_problem(uuid, text, boolean) to authenticated;
comment on function public.fn_report_cleaning_problem is
  '"Housekeeping can... report problems". p_blocks_room lets housekeeping '
  'flag severity at the point of report: false -> maintenance_required '
  '(operational flag only), true -> blocked + an active room_blocks row, '
  'which is what actually prevents future bookings at the calendar level '
  'via Phase 1''s occupancy_periods EXCLUDE constraint (0006). A '
  'technician can still escalate severity later during diagnosis by '
  'updating blocks_room through an authorized RPC — not modeled here to '
  'keep this package''s scope to the required workflows; see the report''s '
  'Known Risks for this as a follow-up.';

-- ---------------------------------------------------------------------
-- 6. Technician RPCs — accept, start, record work, complete, close
-- ---------------------------------------------------------------------

create or replace function public.fn_accept_maintenance_request(p_maintenance_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff_assignments
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_accept_maintenance_request: caller is not the assigned technician for request %', p_maintenance_request_id;
  end if;

  update public.staff_assignments
    set status = 'accepted', accepted_at = now()
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null;

  update public.maintenance_requests
    set status = 'acknowledged'
    where id = p_maintenance_request_id and status = 'reported';
end;
$$;
grant execute on function public.fn_accept_maintenance_request(uuid) to authenticated;

create or replace function public.fn_start_maintenance_request(p_maintenance_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_unit_id uuid;
begin
  if not exists (
    select 1 from public.staff_assignments
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_start_maintenance_request: caller is not the assigned technician for request %', p_maintenance_request_id;
  end if;

  select room_unit_id into v_room_unit_id from public.maintenance_requests
    where id = p_maintenance_request_id and status = 'acknowledged';
  if v_room_unit_id is null then
    raise exception 'fn_start_maintenance_request: request % is not in acknowledged status', p_maintenance_request_id;
  end if;

  update public.maintenance_requests
    set status = 'in_progress', started_at = now()
    where id = p_maintenance_request_id;

  perform public.fn_transition_room_status(
    v_room_unit_id, 'maintenance_in_progress',
    p_maintenance_request_id => p_maintenance_request_id,
    p_note => 'technician started work'
  );
end;
$$;
grant execute on function public.fn_start_maintenance_request(uuid) to authenticated;

create or replace function public.fn_record_maintenance_work_log(
  p_maintenance_request_id uuid,
  p_log_type public.work_log_type,
  p_description text default null,
  p_material_name text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_cost_kgs numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  if not exists (
    select 1 from public.staff_assignments
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_record_maintenance_work_log: caller is not the assigned technician for request %', p_maintenance_request_id;
  end if;
  if not exists (
    select 1 from public.maintenance_requests
    where id = p_maintenance_request_id and status in ('acknowledged', 'in_progress', 'on_hold')
  ) then
    raise exception 'fn_record_maintenance_work_log: request % is not open for work logging', p_maintenance_request_id;
  end if;

  insert into public.maintenance_work_logs
    (maintenance_request_id, technician_id, log_type, description, material_name, quantity, unit, cost_kgs)
  values
    (p_maintenance_request_id, auth.uid(), p_log_type, p_description, p_material_name, p_quantity, p_unit, p_cost_kgs)
  returning id into v_log_id;

  if p_log_type = 'diagnosis' then
    update public.maintenance_requests
      set diagnosis = p_description, diagnosed_at = now()
      where id = p_maintenance_request_id;
  end if;

  return v_log_id;
end;
$$;
grant execute on function public.fn_record_maintenance_work_log(
  uuid, public.work_log_type, text, text, numeric, text, numeric
) to authenticated;
comment on function public.fn_record_maintenance_work_log is
  '"Technician can diagnose, record work and materials": log_type = '
  '''diagnosis'' additionally mirrors description into '
  'maintenance_requests.diagnosis for quick display; ''work_performed'' '
  'and ''material_used'' rows are purely additive to '
  'maintenance_work_logs and never mutate the parent request row.';

create or replace function public.fn_complete_maintenance_work(p_maintenance_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff_assignments
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null
  ) then
    raise exception 'fn_complete_maintenance_work: caller is not the assigned technician for request %', p_maintenance_request_id;
  end if;

  update public.maintenance_requests
    set status = 'completed', completed_at = now()
    where id = p_maintenance_request_id and status = 'in_progress';

  update public.staff_assignments
    set status = 'completed', completed_at = now(), released_at = now()
    where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null;

  perform public.fn_notify_role(
    'administrator', 'maintenance_completed',
    'Repair work completed, awaiting close-out',
    'Request: ' || p_maintenance_request_id,
    'maintenance_requests', p_maintenance_request_id
  );
end;
$$;
grant execute on function public.fn_complete_maintenance_work(uuid) to authenticated;
comment on function public.fn_complete_maintenance_work is
  'The technician''s own "I am done" signal (repair work + materials + '
  'result photos recorded). Does NOT close the ticket or change room '
  'status — that is fn_close_maintenance_request below, restricted to '
  'owner/administrator/manager, matching the required workflow''s '
  '"Authorized user closes the request" as a distinct step.';

create or replace function public.fn_close_maintenance_request(
  p_maintenance_request_id uuid,
  p_resulting_status public.room_operational_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_unit_id uuid;
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'fn_close_maintenance_request: caller is not authorized to close maintenance requests';
  end if;
  if p_resulting_status not in ('inspection_required', 'ready') then
    raise exception 'fn_close_maintenance_request: resulting status must be inspection_required or ready, got %', p_resulting_status;
  end if;

  select room_unit_id into v_room_unit_id from public.maintenance_requests
    where id = p_maintenance_request_id and status = 'completed';
  if v_room_unit_id is null then
    raise exception 'fn_close_maintenance_request: request % is not in completed status', p_maintenance_request_id;
  end if;

  update public.maintenance_requests
    set status = 'closed', closed_by = auth.uid(), closed_at = now(),
        resulting_operational_status = p_resulting_status
    where id = p_maintenance_request_id;

  update public.room_blocks
    set is_active = false
    where maintenance_request_id = p_maintenance_request_id and is_active = true;

  perform public.fn_transition_room_status(
    v_room_unit_id, p_resulting_status,
    p_maintenance_request_id => p_maintenance_request_id,
    p_note => coalesce(p_note, 'maintenance request closed')
  );
end;
$$;
grant execute on function public.fn_close_maintenance_request(uuid, public.room_operational_status, text) to authenticated;
comment on function public.fn_close_maintenance_request is
  'Deactivating the linked room_blocks row here (if any) is what makes '
  '"maintenance or technical block must prevent room availability" a '
  'reversible, not permanent, guarantee — Phase 1''s trg_room_blocks_occupancy '
  '(0006) reacts to is_active flipping false by releasing the '
  'corresponding occupancy_periods row, so the room becomes bookable '
  'again for future dates the instant the block is lifted, independent '
  'of the operational_status change made in the same call.';

-- ---------------------------------------------------------------------
-- 7. Recording an inspection (owner/administrator/manager only)
-- ---------------------------------------------------------------------
-- This is the "Administrator approves" step of the checkout-to-readiness
-- workflow, and the equivalent post-maintenance sign-off. It is the only
-- path that inserts into room_inspections; housekeeping/technician cannot
-- self-certify their own work (enforced by role check below, independent
-- of RLS).

create or replace function public.fn_record_room_inspection(
  p_room_unit_id uuid,
  p_trigger_reason public.inspection_trigger_reason,
  p_result public.inspection_result,
  p_cleaning_task_id uuid default null,
  p_maintenance_request_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspection_id uuid;
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'fn_record_room_inspection: caller is not authorized to record inspections';
  end if;

  insert into public.room_inspections
    (room_unit_id, cleaning_task_id, maintenance_request_id, trigger_reason, inspected_by, result, notes)
  values
    (p_room_unit_id, p_cleaning_task_id, p_maintenance_request_id, p_trigger_reason, auth.uid(), p_result, p_notes)
  returning id into v_inspection_id;

  if p_result = 'passed' then
    perform public.fn_transition_room_status(
      p_room_unit_id, 'ready',
      p_cleaning_task_id => p_cleaning_task_id,
      p_maintenance_request_id => p_maintenance_request_id,
      p_room_inspection_id => v_inspection_id,
      p_note => 'inspection passed'
    );
  elsif p_trigger_reason = 'post_cleaning' then
    perform public.fn_transition_room_status(
      p_room_unit_id, 'cleaning_required',
      p_cleaning_task_id => p_cleaning_task_id,
      p_room_inspection_id => v_inspection_id,
      p_note => 'inspection failed, re-clean required'
    );
  elsif p_trigger_reason = 'post_maintenance' then
    perform public.fn_transition_room_status(
      p_room_unit_id, 'maintenance_required',
      p_maintenance_request_id => p_maintenance_request_id,
      p_room_inspection_id => v_inspection_id,
      p_note => 'inspection failed after maintenance, further work required'
    );
  end if;

  return v_inspection_id;
end;
$$;
grant execute on function public.fn_record_room_inspection(
  uuid, public.inspection_trigger_reason, public.inspection_result, uuid, uuid, text
) to authenticated;
comment on function public.fn_record_room_inspection is
  'A failed post_cleaning inspection returns the room to cleaning_required '
  'without automatically creating a new cleaning_tasks row or reassigning '
  'staff — re-dispatch (possibly to a different housekeeper) is a '
  'deliberate fn_assign_staff call by management, not an automatic retry.';

-- ---------------------------------------------------------------------
-- 8. Room inspections trigger a notification on failure
-- ---------------------------------------------------------------------

create or replace function public.fn_notify_inspection_failed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.result = 'failed' then
    perform public.fn_notify_role(
      'housekeeping', 'inspection_failed',
      'Inspection failed — re-clean required',
      coalesce(new.notes, ''),
      'room_inspections', new.id
    );
  end if;
  return new;
end;
$$;
create trigger trg_room_inspections_notify_failed
  after insert on public.room_inspections
  for each row execute function public.fn_notify_inspection_failed();
comment on trigger trg_room_inspections_notify_failed on public.room_inspections is
  'Broadcasts to the whole housekeeping role rather than a single '
  'assignee, since the original cleaning_task assignment was already '
  'released on completion (0012/0016) — dispatch of the re-clean is a '
  'manager/administrator action via fn_assign_staff, same as any other '
  'cleaning task.';

-- ---------------------------------------------------------------------
-- 9. Extend Phase 1's generic row-change audit to the new tables
-- ---------------------------------------------------------------------
-- fn_audit_row_change() itself is declared in Phase 1 0007 and is not
-- redefined here — only new triggers are attached, exactly the pattern
-- Phase 1 used for user_roles/roles/room_units/bookings.

create trigger trg_audit_cleaning_tasks
  after insert or update or delete on public.cleaning_tasks
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_maintenance_requests
  after insert or update or delete on public.maintenance_requests
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_staff_assignments
  after insert or update or delete on public.staff_assignments
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_room_blocks
  after insert or update or delete on public.room_blocks
  for each row execute function public.fn_audit_row_change();
comment on trigger trg_audit_room_blocks on public.room_blocks is
  'Phase 1 did not attach audit_log coverage to room_blocks. Phase 2 adds '
  'it here because room_blocks now also carries maintenance_request_id '
  'and directly determines room availability — a strictly additive, '
  'backward-compatible extension of Phase 1''s audit surface.';

create trigger trg_audit_room_inspections
  after insert or update or delete on public.room_inspections
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_maintenance_work_logs
  after insert or update or delete on public.maintenance_work_logs
  for each row execute function public.fn_audit_row_change();

commit;
