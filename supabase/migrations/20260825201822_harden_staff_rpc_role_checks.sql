create or replace function public.fn_accept_cleaning_task(p_cleaning_task_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.has_role('housekeeping') then
    raise exception 'fn_accept_cleaning_task: housekeeping role required'
      using errcode = '42501';
  end if;

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
$function$;

create or replace function public.fn_start_cleaning_task(p_cleaning_task_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_room_unit_id uuid;
begin
  if not public.has_role('housekeeping') then
    raise exception 'fn_start_cleaning_task: housekeeping role required'
      using errcode = '42501';
  end if;

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
$function$;

create or replace function public.fn_accept_maintenance_request(p_maintenance_request_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.has_role('technician') then
    raise exception 'fn_accept_maintenance_request: technician role required'
      using errcode = '42501';
  end if;

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
$function$;

create or replace function public.fn_start_maintenance_request(p_maintenance_request_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_room_unit_id uuid;
begin
  if not public.has_role('technician') then
    raise exception 'fn_start_maintenance_request: technician role required'
      using errcode = '42501';
  end if;

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
$function$;

create or replace function public.fn_record_maintenance_work_log(
  p_maintenance_request_id uuid,
  p_log_type public.work_log_type,
  p_description text default null::text,
  p_material_name text default null::text,
  p_quantity numeric default null::numeric,
  p_unit text default null::text,
  p_cost_kgs numeric default null::numeric
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_log_id uuid;
begin
  if not public.has_role('technician') then
    raise exception 'fn_record_maintenance_work_log: technician role required'
      using errcode = '42501';
  end if;

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
$function$;
