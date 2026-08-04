-- Manager inspection action: create or reuse one active blocking
-- maintenance request and block the room atomically.

begin;

create or replace function public.fn_mark_inspection_blocking_problem(
  p_room_unit_id uuid,
  p_note text,
  p_cleaning_task_id uuid default null,
  p_maintenance_request_id uuid default null
)
returns table (
  maintenance_request_id uuid,
  room_inspection_id uuid,
  created boolean,
  room_status public.room_operational_status
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_note text := btrim(p_note);
  v_request_id uuid;
  v_inspection_id uuid;
  v_created boolean := false;
  v_room_status public.room_operational_status;
begin
  if auth.uid() is null then
    raise exception 'fn_mark_inspection_blocking_problem: authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null
  ) then
    raise exception 'fn_mark_inspection_blocking_problem: caller is not active staff';
  end if;

  if not (
    public.has_role('owner')
    or public.has_role('administrator')
    or public.has_role('manager')
  ) then
    raise exception 'fn_mark_inspection_blocking_problem: caller is not authorized';
  end if;

  if p_room_unit_id is null then
    raise exception 'fn_mark_inspection_blocking_problem: room identifier is required';
  end if;
  if v_note is null or v_note = '' or char_length(v_note) > 2000 then
    raise exception 'fn_mark_inspection_blocking_problem: manager note must contain 1 to 2000 characters';
  end if;
  if (p_cleaning_task_id is null) = (p_maintenance_request_id is null) then
    raise exception 'fn_mark_inspection_blocking_problem: exactly one source task identifier is required';
  end if;

  -- The room lock serializes the duplicate check and all following writes
  -- for a physical room, including calls with different source tasks.
  select ru.operational_status
    into v_room_status
    from public.room_units ru
    where ru.id = p_room_unit_id
      and ru.deleted_at is null
    for update;
  if not found then
    raise exception 'fn_mark_inspection_blocking_problem: room % does not exist', p_room_unit_id;
  end if;

  if p_cleaning_task_id is not null then
    perform 1
      from public.cleaning_tasks ct
      where ct.id = p_cleaning_task_id
        and ct.room_unit_id = p_room_unit_id
        and ct.status = 'done'
      for update;
    if not found then
      raise exception 'fn_mark_inspection_blocking_problem: cleaning task is not a completed task for room %', p_room_unit_id;
    end if;
  else
    perform 1
      from public.maintenance_requests mr
      where mr.id = p_maintenance_request_id
        and mr.room_unit_id = p_room_unit_id
        and mr.status in ('completed', 'closed')
      for update;
    if not found then
      raise exception 'fn_mark_inspection_blocking_problem: maintenance task is not inspectable for room %', p_room_unit_id;
    end if;
  end if;

  if v_room_status not in (
    'inspection_required',
    'maintenance_required',
    'maintenance_in_progress',
    'blocked'
  ) then
    raise exception 'fn_mark_inspection_blocking_problem: room % is not in an inspection workflow', p_room_unit_id;
  end if;

  select mr.id
    into v_request_id
    from public.maintenance_requests mr
    where mr.room_unit_id = p_room_unit_id
      and mr.blocks_room = true
      and mr.status in ('reported', 'acknowledged', 'in_progress', 'on_hold', 'completed')
    order by mr.created_at, mr.id
    limit 1
    for update;

  if v_request_id is null then
    insert into public.maintenance_requests (
      room_unit_id,
      cleaning_task_id,
      reported_by,
      description,
      priority,
      blocks_room
    ) values (
      p_room_unit_id,
      p_cleaning_task_id,
      auth.uid(),
      v_note,
      'urgent',
      true
    )
    returning id into v_request_id;
    v_created := true;
  end if;

  if not exists (
    select 1
    from public.room_blocks rb
    where rb.maintenance_request_id = v_request_id
      and rb.is_active = true
  ) then
    insert into public.room_blocks (
      room_unit_id,
      block_type,
      date_range,
      reason,
      created_by,
      maintenance_request_id
    ) values (
      p_room_unit_id,
      'maintenance',
      daterange(current_date, null, '[)'),
      v_note,
      auth.uid(),
      v_request_id
    );
  end if;

  insert into public.room_inspections (
    room_unit_id,
    cleaning_task_id,
    maintenance_request_id,
    trigger_reason,
    inspected_by,
    result,
    notes
  ) values (
    p_room_unit_id,
    p_cleaning_task_id,
    p_maintenance_request_id,
    case
      when p_cleaning_task_id is not null then 'post_cleaning'::public.inspection_trigger_reason
      else 'post_maintenance'::public.inspection_trigger_reason
    end,
    auth.uid(),
    'failed',
    v_note
  )
  returning id into v_inspection_id;

  perform public.fn_transition_room_status(
    p_room_unit_id,
    'blocked',
    p_cleaning_task_id => p_cleaning_task_id,
    p_maintenance_request_id => v_request_id,
    p_room_inspection_id => v_inspection_id,
    p_note => v_note
  );

  return query
    select v_request_id, v_inspection_id, v_created, 'blocked'::public.room_operational_status;
end;
$$;

revoke all on function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) from public;
grant execute on function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) to authenticated;

comment on function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) is
  'Owner/administrator/manager inspection action. Locks the room, records '
  'the failed inspection, reuses an active blocking maintenance request '
  'or creates one, creates the linked availability block, and transitions '
  'the room to blocked in one audited transaction.';

commit;
