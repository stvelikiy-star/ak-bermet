-- AK BERMET DEV ONLY — forward repair R2-R7. Production is not touched.

create or replace function public.has_role(p_role public.role_name)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where auth.uid() is not null and ur.user_id = auth.uid()
      and r.name = p_role and ur.deleted_at is null
      and p.is_active = true and p.deleted_at is null
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where auth.uid() is not null and ur.user_id = auth.uid()
      and ur.deleted_at is null and p.is_active = true and p.deleted_at is null
  );
$$;

do $$
declare rec record;
begin
  for rec in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and 'public' = any(roles)
      and (
        position('has_role' in coalesce(qual, '')) > 0 or
        position('is_staff' in coalesce(qual, '')) > 0 or
        position('has_role' in coalesce(with_check, '')) > 0 or
        position('is_staff' in coalesce(with_check, '')) > 0
      )
  loop
    execute format('alter policy %I on %I.%I to authenticated', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;

revoke all on function public.has_role(public.role_name) from public, anon, authenticated;
grant execute on function public.has_role(public.role_name) to authenticated, service_role;
revoke all on function public.is_staff() from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated, service_role;
revoke all on function public.log_lead_status_change() from public, anon, authenticated;
grant execute on function public.log_lead_status_change() to service_role;
revoke all on function public.log_booking_status_change() from public, anon, authenticated;
grant execute on function public.log_booking_status_change() to service_role;

drop policy if exists leads_public_insert on public.leads;
revoke insert on public.leads from anon;
drop policy if exists room_units_public_read on public.room_units;
revoke select on public.room_units from anon;

drop policy if exists customers_staff_all on public.customers;
create policy customers_management_select on public.customers for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
drop policy if exists leads_staff_write on public.leads;
drop policy if exists bookings_staff_all on public.bookings;
create policy bookings_management_select on public.bookings for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
drop policy if exists booking_rooms_staff_all on public.booking_rooms;
create policy booking_rooms_management_select on public.booking_rooms for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
drop policy if exists holds_staff_all on public.availability_holds;
create policy holds_management_select on public.availability_holds for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
drop policy if exists room_units_staff_write on public.room_units;
drop policy if exists room_blocks_admin_write on public.room_blocks;
drop policy if exists cleaning_tasks_admin_all on public.cleaning_tasks;
create policy cleaning_tasks_admin_select on public.cleaning_tasks for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator'));
drop policy if exists maintenance_requests_admin_all on public.maintenance_requests;
create policy maintenance_requests_admin_select on public.maintenance_requests for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator'));
drop policy if exists staff_assignments_admin_all on public.staff_assignments;
create policy staff_assignments_management_select on public.staff_assignments for select to authenticated
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
drop policy if exists task_attachments_housekeeping_insert on public.task_attachments;
drop policy if exists task_attachments_technician_insert on public.task_attachments;
drop policy if exists task_attachments_inspector_insert on public.task_attachments;

revoke insert, update, delete on table
  public.customers, public.leads, public.bookings, public.booking_rooms,
  public.availability_holds, public.room_units, public.room_blocks,
  public.cleaning_tasks, public.maintenance_requests, public.maintenance_work_logs,
  public.staff_assignments, public.room_inspections, public.task_attachments
from authenticated;

create or replace function public.fn_release_assignments_for_inactive_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (old.is_active = true and new.is_active = false)
     or (old.deleted_at is null and new.deleted_at is not null) then
    update public.staff_assignments set status = 'released', released_at = now()
    where staff_id = new.id and released_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.fn_release_assignments_for_inactive_profile() from public, anon, authenticated;
grant execute on function public.fn_release_assignments_for_inactive_profile() to service_role;
drop trigger if exists trg_profiles_release_assignments on public.profiles;
create trigger trg_profiles_release_assignments after update of is_active, deleted_at on public.profiles
for each row execute function public.fn_release_assignments_for_inactive_profile();

create or replace function public.fn_release_assignments_for_revoked_role()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid;
begin
  if tg_op = 'DELETE' then v_user_id := old.user_id;
  elsif old.deleted_at is null and new.deleted_at is not null then v_user_id := new.user_id;
  else return coalesce(new, old); end if;
  update public.staff_assignments set status = 'released', released_at = now()
  where staff_id = v_user_id and released_at is null;
  return coalesce(new, old);
end;
$$;
revoke all on function public.fn_release_assignments_for_revoked_role() from public, anon, authenticated;
grant execute on function public.fn_release_assignments_for_revoked_role() to service_role;
drop trigger if exists trg_user_roles_release_assignments on public.user_roles;
create trigger trg_user_roles_release_assignments after update of deleted_at or delete on public.user_roles
for each row execute function public.fn_release_assignments_for_revoked_role();

create or replace function public.fn_notify_role(
  p_role public.role_name, p_type public.operational_notification_type,
  p_title text, p_body text, p_related_table text, p_related_id uuid
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.operational_notifications
    (recipient_id, notification_type, title, body, related_table, related_id)
  select ur.user_id, p_type, p_title, p_body, p_related_table, p_related_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where r.name = p_role and ur.deleted_at is null
    and p.is_active = true and p.deleted_at is null;
end;
$$;
revoke all on function public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid) to service_role;

create or replace function public.fn_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_staff() then
    raise exception 'fn_mark_notification_read: active staff session required' using errcode = '42501';
  end if;
  update public.operational_notifications set is_read = true, read_at = now()
  where id = p_notification_id and recipient_id = auth.uid() and is_read = false;
end;
$$;
revoke all on function public.fn_mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.fn_mark_notification_read(uuid) to authenticated, service_role;

insert into public.room_status_transitions (from_status, to_status) values
  ('cleaning_in_progress', 'cleaning_required'),
  ('cleaning_in_progress', 'ready'),
  ('maintenance_in_progress', 'maintenance_required')
on conflict do nothing;
delete from public.room_status_transitions
where (from_status = 'maintenance_in_progress' and to_status = 'ready')
   or (from_status = 'blocked' and to_status = 'ready');

create or replace function public.fn_checkout_creates_cleaning_task()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room record; v_task_id uuid;
begin
  for v_room in select br.room_unit_id from public.booking_rooms br
                where br.booking_id = new.id and br.status = 'active'
  loop
    perform public.fn_transition_room_status(v_room.room_unit_id, 'checkout_pending', p_note => 'automatic: guest checkout');
    insert into public.cleaning_tasks (room_unit_id, booking_id, created_by, requires_inspection)
    values (v_room.room_unit_id, new.id, null, false) returning id into v_task_id;
    perform public.fn_transition_room_status(v_room.room_unit_id, 'cleaning_required',
      p_cleaning_task_id => v_task_id, p_note => 'automatic: cleaning task created on checkout');
  end loop;
  return new;
end;
$$;
revoke all on function public.fn_checkout_creates_cleaning_task() from public, anon, authenticated;
grant execute on function public.fn_checkout_creates_cleaning_task() to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-attachments','task-attachments',false,10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists task_attachments_storage_insert on storage.objects;
drop policy if exists task_attachments_storage_select on storage.objects;
create policy task_attachments_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'task-attachments'
  and split_part(name,'/',1) = auth.uid()::text
  and split_part(name,'/',2) <> '' and split_part(name,'/',3) <> '' and split_part(name,'/',4) = ''
  and (
    (public.has_role('housekeeping') and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id::text = split_part(name,'/',2)
        and sa.staff_id = auth.uid() and sa.released_at is null
    ))
    or (public.has_role('technician') and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id::text = split_part(name,'/',2)
        and sa.staff_id = auth.uid() and sa.released_at is null
    ))
    or public.has_role('owner') or public.has_role('administrator')
  )
);
create policy task_attachments_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'task-attachments' and (
    public.has_role('owner') or public.has_role('administrator')
    or (split_part(name,'/',1) = auth.uid()::text and public.has_role('housekeeping') and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id::text = split_part(name,'/',2)
        and sa.staff_id = auth.uid() and sa.released_at is null
    ))
    or (split_part(name,'/',1) = auth.uid()::text and public.has_role('technician') and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id::text = split_part(name,'/',2)
        and sa.staff_id = auth.uid() and sa.released_at is null
    ))
  )
);

create or replace function public.fn_record_task_attachment(
  p_entity_type public.attachment_entity_type, p_task_id uuid,
  p_phase public.attachment_phase, p_storage_path text
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_prefix text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'fn_record_task_attachment: active staff session required' using errcode = '42501';
  end if;
  if p_task_id is null or nullif(btrim(p_storage_path),'') is null then
    raise exception 'fn_record_task_attachment: task and storage path are required' using errcode = '22023';
  end if;
  v_prefix := auth.uid()::text || '/' || p_task_id::text || '/';
  if position(v_prefix in p_storage_path) <> 1
     or split_part(p_storage_path,'/',3) = '' or split_part(p_storage_path,'/',4) <> ''
     or position('..' in p_storage_path) > 0 then
    raise exception 'fn_record_task_attachment: invalid storage path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'task-attachments' and o.name = p_storage_path) then
    raise exception 'fn_record_task_attachment: storage object not found' using errcode = '22023';
  end if;

  if p_entity_type = 'cleaning_task' then
    if p_phase not in ('before','after') or not public.has_role('housekeeping')
       or not exists (select 1 from public.staff_assignments sa
         where sa.cleaning_task_id = p_task_id and sa.staff_id = auth.uid() and sa.released_at is null) then
      raise exception 'fn_record_task_attachment: cleaning attachment not authorized' using errcode = '42501';
    end if;
  elsif p_entity_type = 'maintenance_request' then
    if p_phase not in ('diagnostic','result') or not public.has_role('technician')
       or not exists (select 1 from public.staff_assignments sa
         where sa.maintenance_request_id = p_task_id and sa.staff_id = auth.uid() and sa.released_at is null) then
      raise exception 'fn_record_task_attachment: maintenance attachment not authorized' using errcode = '42501';
    end if;
  elsif p_entity_type = 'room_inspection' then
    if not (public.has_role('owner') or public.has_role('administrator'))
       or not exists (select 1 from public.room_inspections ri where ri.id = p_task_id) then
      raise exception 'fn_record_task_attachment: inspection attachment not authorized' using errcode = '42501';
    end if;
  else
    raise exception 'fn_record_task_attachment: unsupported entity type' using errcode = '22023';
  end if;

  select ta.id into v_id from public.task_attachments ta
  where ta.storage_path = p_storage_path and ta.uploaded_by = auth.uid()
  order by ta.created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.task_attachments
    (entity_type, cleaning_task_id, maintenance_request_id, room_inspection_id, phase, storage_path, uploaded_by)
  values (
    p_entity_type,
    case when p_entity_type = 'cleaning_task' then p_task_id else null end,
    case when p_entity_type = 'maintenance_request' then p_task_id else null end,
    case when p_entity_type = 'room_inspection' then p_task_id else null end,
    p_phase, p_storage_path, auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.fn_record_task_attachment(public.attachment_entity_type, uuid, public.attachment_phase, text) from public, anon, authenticated;
grant execute on function public.fn_record_task_attachment(public.attachment_entity_type, uuid, public.attachment_phase, text) to authenticated;

create or replace function public.fn_complete_cleaning_task(p_cleaning_task_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_room_unit_id uuid;
  v_requires_inspection boolean;
  v_status public.cleaning_task_status;
  v_started_at timestamptz;
begin
  if not public.has_role('housekeeping') then
    raise exception 'fn_complete_cleaning_task: active housekeeping role required' using errcode = '42501';
  end if;
  select ct.room_unit_id, ct.requires_inspection, ct.status, ct.started_at
    into v_room_unit_id, v_requires_inspection, v_status, v_started_at
  from public.cleaning_tasks ct
  join public.staff_assignments sa on sa.cleaning_task_id = ct.id
    and sa.staff_id = auth.uid() and sa.released_at is null
  where ct.id = p_cleaning_task_id for update of ct, sa;
  if not found then raise exception 'fn_complete_cleaning_task: active assignment required' using errcode = '42501'; end if;
  if v_status <> 'in_progress' or v_started_at is null then
    raise exception 'fn_complete_cleaning_task: task is not in progress' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.task_attachments ta
    where ta.entity_type = 'cleaning_task' and ta.cleaning_task_id = p_cleaning_task_id
      and ta.phase = 'after' and ta.uploaded_by = auth.uid() and ta.created_at >= v_started_at
  ) then
    raise exception 'fn_complete_cleaning_task: after photo required for current cleaning cycle' using errcode = '22023';
  end if;

  update public.cleaning_tasks set status = 'done', completed_at = now() where id = p_cleaning_task_id;
  update public.staff_assignments set status = 'completed', completed_at = now(), released_at = now()
  where cleaning_task_id = p_cleaning_task_id and staff_id = auth.uid() and released_at is null;

  if v_requires_inspection then
    perform public.fn_transition_room_status(v_room_unit_id, 'inspection_required',
      p_cleaning_task_id => p_cleaning_task_id, p_note => 'cleaning complete, inspection required');
    perform public.fn_notify_role('administrator','inspection_required','Room ready for inspection',
      'Room: ' || v_room_unit_id,'cleaning_tasks',p_cleaning_task_id);
  else
    perform public.fn_transition_room_status(v_room_unit_id, 'ready',
      p_cleaning_task_id => p_cleaning_task_id, p_note => 'cleaning complete, after photo recorded');
    perform public.fn_notify_role('administrator','room_ready','Room ready',
      'Room: ' || v_room_unit_id,'cleaning_tasks',p_cleaning_task_id);
  end if;
end;
$$;
revoke all on function public.fn_complete_cleaning_task(uuid) from public, anon, authenticated;
grant execute on function public.fn_complete_cleaning_task(uuid) to authenticated;

create or replace function public.fn_report_cleaning_problem(
  p_cleaning_task_id uuid, p_note text, p_blocks_room boolean default false
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_room_unit_id uuid; v_request_id uuid; v_assignment_at timestamptz;
  v_status public.cleaning_task_status;
begin
  if not public.has_role('housekeeping') then
    raise exception 'fn_report_cleaning_problem: active housekeeping role required' using errcode = '42501';
  end if;
  if nullif(btrim(p_note),'') is null or char_length(btrim(p_note)) > 1000 then
    raise exception 'fn_report_cleaning_problem: problem note required' using errcode = '22023';
  end if;
  select ct.room_unit_id, ct.status, sa.assigned_at into v_room_unit_id, v_status, v_assignment_at
  from public.cleaning_tasks ct join public.staff_assignments sa
    on sa.cleaning_task_id = ct.id and sa.staff_id = auth.uid() and sa.released_at is null
  where ct.id = p_cleaning_task_id for update of ct, sa;
  if not found then raise exception 'fn_report_cleaning_problem: active assignment required' using errcode = '42501'; end if;
  if v_status not in ('pending','accepted','in_progress') then
    raise exception 'fn_report_cleaning_problem: task is not open for problem reporting' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.task_attachments ta
    where ta.entity_type = 'cleaning_task' and ta.cleaning_task_id = p_cleaning_task_id
      and ta.phase = 'before' and ta.uploaded_by = auth.uid() and ta.created_at >= v_assignment_at
  ) then
    raise exception 'fn_report_cleaning_problem: before photo required for current assignment' using errcode = '22023';
  end if;

  update public.cleaning_tasks set status = 'problem_reported', reported_problem = btrim(p_note), requires_inspection = true
  where id = p_cleaning_task_id;
  insert into public.maintenance_requests (room_unit_id, cleaning_task_id, reported_by, description, blocks_room)
  values (v_room_unit_id,p_cleaning_task_id,auth.uid(),btrim(p_note),coalesce(p_blocks_room,false))
  returning id into v_request_id;

  if coalesce(p_blocks_room,false) then
    insert into public.room_blocks (room_unit_id,block_type,date_range,reason,created_by,maintenance_request_id)
    values (v_room_unit_id,'maintenance',daterange(current_date,null,'[)'),btrim(p_note),auth.uid(),v_request_id);
    perform public.fn_transition_room_status(v_room_unit_id,'blocked',
      p_maintenance_request_id => v_request_id,p_note => 'blocked: problem reported during cleaning');
  else
    perform public.fn_transition_room_status(v_room_unit_id,'maintenance_required',
      p_maintenance_request_id => v_request_id,p_note => 'maintenance required: problem reported during cleaning');
  end if;
  perform public.fn_notify_role('administrator','cleaning_task_problem_reported',
    'Problem reported during cleaning',btrim(p_note),'maintenance_requests',v_request_id);
  return v_request_id;
end;
$$;
revoke all on function public.fn_report_cleaning_problem(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.fn_report_cleaning_problem(uuid,text,boolean) to authenticated;

create or replace function public.fn_complete_maintenance_work(p_maintenance_request_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_started_at timestamptz; v_status public.maintenance_status;
begin
  if not public.has_role('technician') then
    raise exception 'fn_complete_maintenance_work: active technician role required' using errcode = '42501';
  end if;
  select mr.status,mr.started_at into v_status,v_started_at
  from public.maintenance_requests mr join public.staff_assignments sa
    on sa.maintenance_request_id = mr.id and sa.staff_id = auth.uid() and sa.released_at is null
  where mr.id = p_maintenance_request_id for update of mr, sa;
  if not found then raise exception 'fn_complete_maintenance_work: active assignment required' using errcode = '42501'; end if;
  if v_status <> 'in_progress' or v_started_at is null then
    raise exception 'fn_complete_maintenance_work: request is not in progress' using errcode = '22023';
  end if;
  if not exists (select 1 from public.maintenance_work_logs wl
    where wl.maintenance_request_id = p_maintenance_request_id and wl.technician_id = auth.uid()
      and wl.log_type = 'diagnosis' and wl.logged_at >= v_started_at) then
    raise exception 'fn_complete_maintenance_work: current-cycle diagnosis required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.maintenance_work_logs wl
    where wl.maintenance_request_id = p_maintenance_request_id and wl.technician_id = auth.uid()
      and wl.log_type = 'work_performed' and wl.logged_at >= v_started_at) then
    raise exception 'fn_complete_maintenance_work: current-cycle work log required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.task_attachments ta
    where ta.entity_type = 'maintenance_request' and ta.maintenance_request_id = p_maintenance_request_id
      and ta.phase = 'diagnostic' and ta.uploaded_by = auth.uid() and ta.created_at >= v_started_at) then
    raise exception 'fn_complete_maintenance_work: diagnostic photo required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.task_attachments ta
    where ta.entity_type = 'maintenance_request' and ta.maintenance_request_id = p_maintenance_request_id
      and ta.phase = 'result' and ta.uploaded_by = auth.uid() and ta.created_at >= v_started_at) then
    raise exception 'fn_complete_maintenance_work: result photo required' using errcode = '22023';
  end if;
  update public.maintenance_requests set status = 'completed', completed_at = now() where id = p_maintenance_request_id;
  update public.staff_assignments set status = 'completed', completed_at = now(), released_at = now()
  where maintenance_request_id = p_maintenance_request_id and staff_id = auth.uid() and released_at is null;
  perform public.fn_notify_role('administrator','maintenance_completed','Repair work completed, awaiting inspection',
    'Request: ' || p_maintenance_request_id,'maintenance_requests',p_maintenance_request_id);
end;
$$;
revoke all on function public.fn_complete_maintenance_work(uuid) from public, anon, authenticated;
grant execute on function public.fn_complete_maintenance_work(uuid) to authenticated;

create or replace function public.fn_assign_staff(
  p_task_type public.assignment_task_type, p_task_id uuid, p_staff_id uuid
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_required_role public.role_name; v_room_unit_id uuid; v_assignment_id uuid;
  v_notif_type public.operational_notification_type; v_clean_status public.cleaning_task_status;
  v_maint_status public.maintenance_status; v_blocks_room boolean;
begin
  if not (public.has_role('owner') or public.has_role('administrator')) then
    raise exception 'fn_assign_staff: owner or administrator required' using errcode = '42501';
  end if;
  v_required_role := case p_task_type when 'cleaning_task' then 'housekeeping'::public.role_name
                        when 'maintenance_request' then 'technician'::public.role_name end;
  if not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.deleted_at is null
    join public.roles r on r.id = ur.role_id
    where p.id = p_staff_id and p.is_active = true and p.deleted_at is null and r.name = v_required_role
  ) then raise exception 'fn_assign_staff: target staff is inactive or lacks required role' using errcode = '22023'; end if;

  if p_task_type = 'cleaning_task' then
    select ct.room_unit_id,ct.status into v_room_unit_id,v_clean_status
    from public.cleaning_tasks ct where ct.id = p_task_id for update;
    if not found or v_clean_status not in ('pending','accepted','in_progress') then
      raise exception 'fn_assign_staff: cleaning task is not assignable' using errcode = '22023';
    end if;
    if v_clean_status = 'in_progress' then
      perform public.fn_transition_room_status(v_room_unit_id,'cleaning_required',
        p_cleaning_task_id => p_task_id,p_note => 'administrative reassignment');
    end if;
    if v_clean_status in ('accepted','in_progress') then
      update public.cleaning_tasks set status='pending',accepted_at=null,started_at=null,completed_at=null where id=p_task_id;
    end if;
    update public.staff_assignments set status='released',released_at=now()
    where cleaning_task_id=p_task_id and released_at is null;
    insert into public.staff_assignments (task_type,cleaning_task_id,staff_id,assigned_by)
    values ('cleaning_task',p_task_id,p_staff_id,auth.uid()) returning id into v_assignment_id;
    v_notif_type := 'cleaning_task_assigned';
  else
    select mr.room_unit_id,mr.status,mr.blocks_room into v_room_unit_id,v_maint_status,v_blocks_room
    from public.maintenance_requests mr where mr.id=p_task_id for update;
    if not found or v_maint_status not in ('reported','acknowledged','in_progress','on_hold') then
      raise exception 'fn_assign_staff: maintenance request is not assignable' using errcode='22023';
    end if;
    if v_maint_status in ('in_progress','on_hold') then
      if v_blocks_room then
        perform public.fn_transition_room_status(v_room_unit_id,'blocked',
          p_maintenance_request_id=>p_task_id,p_note=>'administrative technician reassignment');
      else
        perform public.fn_transition_room_status(v_room_unit_id,'maintenance_required',
          p_maintenance_request_id=>p_task_id,p_note=>'administrative technician reassignment');
      end if;
    end if;
    if v_maint_status <> 'reported' then
      update public.maintenance_requests set status='reported',diagnosis=null,diagnosed_at=null,
        started_at=null,completed_at=null,closed_by=null,closed_at=null,resulting_operational_status=null
      where id=p_task_id;
    end if;
    update public.staff_assignments set status='released',released_at=now()
    where maintenance_request_id=p_task_id and released_at is null;
    insert into public.staff_assignments (task_type,maintenance_request_id,staff_id,assigned_by)
    values ('maintenance_request',p_task_id,p_staff_id,auth.uid()) returning id into v_assignment_id;
    v_notif_type := 'maintenance_assigned';
  end if;
  perform public.fn_notify_user(p_staff_id,v_notif_type,
    case when p_task_type='cleaning_task' then 'New cleaning task assigned' else 'New maintenance request assigned' end,
    'Room: ' || v_room_unit_id,
    case when p_task_type='cleaning_task' then 'cleaning_tasks' else 'maintenance_requests' end,p_task_id);
  return v_assignment_id;
end;
$$;
revoke all on function public.fn_assign_staff(public.assignment_task_type,uuid,uuid) from public, anon, authenticated;
grant execute on function public.fn_assign_staff(public.assignment_task_type,uuid,uuid) to authenticated;

create or replace function public.fn_close_maintenance_request(
  p_maintenance_request_id uuid, p_resulting_status public.room_operational_status, p_note text default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room_unit_id uuid;
begin
  if not (public.has_role('owner') or public.has_role('administrator')) then
    raise exception 'fn_close_maintenance_request: owner or administrator required' using errcode='42501';
  end if;
  if p_resulting_status <> 'inspection_required' then
    raise exception 'fn_close_maintenance_request: repair must go to inspection_required' using errcode='22023';
  end if;
  select room_unit_id into v_room_unit_id from public.maintenance_requests
  where id=p_maintenance_request_id and status='completed' for update;
  if not found then raise exception 'fn_close_maintenance_request: request is not completed' using errcode='22023'; end if;
  update public.maintenance_requests set status='closed',closed_by=auth.uid(),closed_at=now(),
    resulting_operational_status='inspection_required' where id=p_maintenance_request_id;
  perform public.fn_transition_room_status(v_room_unit_id,'inspection_required',
    p_maintenance_request_id=>p_maintenance_request_id,
    p_note=>coalesce(nullif(btrim(p_note),''),'maintenance completed; inspection required'));
end;
$$;
revoke all on function public.fn_close_maintenance_request(uuid,public.room_operational_status,text) from public, anon, authenticated;
grant execute on function public.fn_close_maintenance_request(uuid,public.room_operational_status,text) to authenticated;

create or replace function public.fn_record_room_inspection(
  p_room_unit_id uuid, p_trigger_reason public.inspection_trigger_reason, p_result public.inspection_result,
  p_cleaning_task_id uuid default null, p_maintenance_request_id uuid default null, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_inspection_id uuid; v_room_status public.room_operational_status;
  v_clean_status public.cleaning_task_status; v_clean_completed_at timestamptz;
  v_maint_status public.maintenance_status; v_maint_closed_at timestamptz;
  v_linked_cleaning uuid; v_blocks_room boolean;
begin
  if not (public.has_role('owner') or public.has_role('administrator')) then
    raise exception 'fn_record_room_inspection: owner or administrator required' using errcode='42501';
  end if;
  if p_trigger_reason not in ('post_cleaning','post_maintenance') then
    raise exception 'fn_record_room_inspection: unsupported inspection reason' using errcode='22023';
  end if;
  if (p_cleaning_task_id is null) = (p_maintenance_request_id is null) then
    raise exception 'fn_record_room_inspection: exactly one source task is required' using errcode='22023';
  end if;
  select operational_status into v_room_status from public.room_units
  where id=p_room_unit_id and deleted_at is null for update;
  if not found or v_room_status <> 'inspection_required' then
    raise exception 'fn_record_room_inspection: room is not awaiting inspection' using errcode='22023';
  end if;

  if p_trigger_reason='post_cleaning' then
    if p_cleaning_task_id is null then raise exception 'fn_record_room_inspection: cleaning source required' using errcode='22023'; end if;
    select status,completed_at into v_clean_status,v_clean_completed_at from public.cleaning_tasks
    where id=p_cleaning_task_id and room_unit_id=p_room_unit_id for update;
    if not found or v_clean_status<>'done' or v_clean_completed_at is null then
      raise exception 'fn_record_room_inspection: cleaning task is not completed' using errcode='22023';
    end if;
    if exists (select 1 from public.room_inspections ri
      where ri.cleaning_task_id=p_cleaning_task_id and ri.created_at>=v_clean_completed_at) then
      raise exception 'fn_record_room_inspection: current cleaning cycle already inspected' using errcode='22023';
    end if;
  else
    if p_maintenance_request_id is null then raise exception 'fn_record_room_inspection: maintenance source required' using errcode='22023'; end if;
    select status,closed_at,cleaning_task_id,blocks_room
      into v_maint_status,v_maint_closed_at,v_linked_cleaning,v_blocks_room
    from public.maintenance_requests where id=p_maintenance_request_id and room_unit_id=p_room_unit_id for update;
    if not found or v_maint_status<>'closed' or v_maint_closed_at is null then
      raise exception 'fn_record_room_inspection: maintenance request is not closed for inspection' using errcode='22023';
    end if;
    if exists (select 1 from public.room_inspections ri
      where ri.maintenance_request_id=p_maintenance_request_id and ri.created_at>=v_maint_closed_at) then
      raise exception 'fn_record_room_inspection: current maintenance cycle already inspected' using errcode='22023';
    end if;
  end if;

  if p_result='passed' then
    if p_trigger_reason='post_cleaning' then
      if exists (select 1 from public.room_blocks rb
          where rb.room_unit_id=p_room_unit_id and rb.is_active=true and rb.deleted_at is null)
         or exists (select 1 from public.maintenance_requests mr
          where mr.room_unit_id=p_room_unit_id and mr.blocks_room=true
            and mr.status in ('reported','acknowledged','in_progress','on_hold','completed')) then
        raise exception 'fn_record_room_inspection: active blocking maintenance prevents ready' using errcode='22023';
      end if;
    else
      if exists (select 1 from public.room_blocks rb
          where rb.room_unit_id=p_room_unit_id and rb.is_active=true and rb.deleted_at is null
            and rb.maintenance_request_id is distinct from p_maintenance_request_id)
         or exists (select 1 from public.maintenance_requests mr
          where mr.room_unit_id=p_room_unit_id and mr.id<>p_maintenance_request_id
            and mr.blocks_room=true and mr.status in ('reported','acknowledged','in_progress','on_hold','completed')) then
        raise exception 'fn_record_room_inspection: another active room block prevents approval' using errcode='22023';
      end if;
    end if;
  end if;

  insert into public.room_inspections
    (room_unit_id,cleaning_task_id,maintenance_request_id,trigger_reason,inspected_by,result,notes)
  values (p_room_unit_id,p_cleaning_task_id,p_maintenance_request_id,p_trigger_reason,auth.uid(),p_result,p_notes)
  returning id into v_inspection_id;

  if p_result='passed' and p_trigger_reason='post_cleaning' then
    perform public.fn_transition_room_status(p_room_unit_id,'ready',p_cleaning_task_id=>p_cleaning_task_id,
      p_room_inspection_id=>v_inspection_id,p_note=>'post-cleaning inspection passed');
  elsif p_result='failed' and p_trigger_reason='post_cleaning' then
    update public.cleaning_tasks set status='pending',accepted_at=null,started_at=null,completed_at=null,requires_inspection=true
    where id=p_cleaning_task_id;
    perform public.fn_transition_room_status(p_room_unit_id,'cleaning_required',p_cleaning_task_id=>p_cleaning_task_id,
      p_room_inspection_id=>v_inspection_id,p_note=>'inspection failed; cleaning rework required');
  elsif p_result='failed' and p_trigger_reason='post_maintenance' then
    update public.maintenance_requests set status='reported',diagnosis=null,diagnosed_at=null,started_at=null,
      completed_at=null,closed_by=null,closed_at=null,resulting_operational_status=null
    where id=p_maintenance_request_id;
    perform public.fn_transition_room_status(p_room_unit_id,
      case when v_blocks_room then 'blocked'::public.room_operational_status else 'maintenance_required'::public.room_operational_status end,
      p_maintenance_request_id=>p_maintenance_request_id,p_room_inspection_id=>v_inspection_id,
      p_note=>'maintenance inspection failed; repair rework required');
  elsif p_result='passed' and p_trigger_reason='post_maintenance' then
    update public.room_blocks set is_active=false
    where maintenance_request_id=p_maintenance_request_id and is_active=true;
    if v_linked_cleaning is not null and exists (
      select 1 from public.cleaning_tasks ct where ct.id=v_linked_cleaning and ct.status='problem_reported'
    ) then
      update public.cleaning_tasks set status='pending',accepted_at=null,started_at=null,completed_at=null,requires_inspection=true
      where id=v_linked_cleaning;
      perform public.fn_transition_room_status(p_room_unit_id,'cleaning_required',p_cleaning_task_id=>v_linked_cleaning,
        p_maintenance_request_id=>p_maintenance_request_id,p_room_inspection_id=>v_inspection_id,
        p_note=>'repair inspection passed; cleaning must resume');
    else
      perform public.fn_transition_room_status(p_room_unit_id,'ready',p_maintenance_request_id=>p_maintenance_request_id,
        p_room_inspection_id=>v_inspection_id,p_note=>'post-maintenance inspection passed');
    end if;
  end if;
  return v_inspection_id;
end;
$$;
revoke all on function public.fn_record_room_inspection(uuid,public.inspection_trigger_reason,public.inspection_result,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.fn_record_room_inspection(uuid,public.inspection_trigger_reason,public.inspection_result,uuid,uuid,text) to authenticated;

create or replace function public.fn_mark_inspection_blocking_problem(
  p_room_unit_id uuid,p_note text,p_cleaning_task_id uuid default null,p_maintenance_request_id uuid default null
)
returns table (maintenance_request_id uuid,room_inspection_id uuid,created boolean,room_status public.room_operational_status)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_note text:=btrim(p_note); v_request_id uuid; v_inspection_id uuid;
  v_created boolean:=false; v_room_status public.room_operational_status; v_cycle_at timestamptz;
begin
  if not (public.has_role('owner') or public.has_role('administrator')) then
    raise exception 'fn_mark_inspection_blocking_problem: owner or administrator required' using errcode='42501';
  end if;
  if p_room_unit_id is null or v_note is null or v_note='' or char_length(v_note)>2000 then
    raise exception 'fn_mark_inspection_blocking_problem: valid room and note required' using errcode='22023';
  end if;
  if (p_cleaning_task_id is null)=(p_maintenance_request_id is null) then
    raise exception 'fn_mark_inspection_blocking_problem: exactly one source task required' using errcode='22023';
  end if;
  select ru.operational_status into v_room_status from public.room_units ru
  where ru.id=p_room_unit_id and ru.deleted_at is null for update;
  if not found or v_room_status<>'inspection_required' then
    raise exception 'fn_mark_inspection_blocking_problem: room is not awaiting inspection' using errcode='22023';
  end if;
  if p_cleaning_task_id is not null then
    select ct.completed_at into v_cycle_at from public.cleaning_tasks ct
    where ct.id=p_cleaning_task_id and ct.room_unit_id=p_room_unit_id and ct.status='done' for update;
    if not found or v_cycle_at is null then raise exception 'fn_mark_inspection_blocking_problem: cleaning source not inspectable' using errcode='22023'; end if;
    if exists (select 1 from public.room_inspections ri where ri.cleaning_task_id=p_cleaning_task_id and ri.created_at>=v_cycle_at) then
      raise exception 'fn_mark_inspection_blocking_problem: current cleaning cycle already inspected' using errcode='22023';
    end if;
  else
    select mr.closed_at into v_cycle_at from public.maintenance_requests mr
    where mr.id=p_maintenance_request_id and mr.room_unit_id=p_room_unit_id and mr.status='closed' for update;
    if not found or v_cycle_at is null then raise exception 'fn_mark_inspection_blocking_problem: maintenance source not inspectable' using errcode='22023'; end if;
    if exists (select 1 from public.room_inspections ri where ri.maintenance_request_id=p_maintenance_request_id and ri.created_at>=v_cycle_at) then
      raise exception 'fn_mark_inspection_blocking_problem: current maintenance cycle already inspected' using errcode='22023';
    end if;
  end if;
  select mr.id into v_request_id from public.maintenance_requests mr
  where mr.room_unit_id=p_room_unit_id and mr.blocks_room=true
    and mr.status in ('reported','acknowledged','in_progress','on_hold','completed')
  order by mr.created_at,mr.id limit 1 for update;
  if v_request_id is null then
    insert into public.maintenance_requests (room_unit_id,cleaning_task_id,reported_by,description,priority,blocks_room)
    values (p_room_unit_id,p_cleaning_task_id,auth.uid(),v_note,'urgent',true) returning id into v_request_id;
    v_created:=true;
  end if;
  if not exists (select 1 from public.room_blocks rb where rb.maintenance_request_id=v_request_id and rb.is_active=true) then
    insert into public.room_blocks (room_unit_id,block_type,date_range,reason,created_by,maintenance_request_id)
    values (p_room_unit_id,'maintenance',daterange(current_date,null,'[)'),v_note,auth.uid(),v_request_id);
  end if;
  insert into public.room_inspections
    (room_unit_id,cleaning_task_id,maintenance_request_id,trigger_reason,inspected_by,result,notes)
  values (p_room_unit_id,p_cleaning_task_id,p_maintenance_request_id,
    case when p_cleaning_task_id is not null then 'post_cleaning'::public.inspection_trigger_reason else 'post_maintenance'::public.inspection_trigger_reason end,
    auth.uid(),'failed',v_note) returning id into v_inspection_id;
  perform public.fn_transition_room_status(p_room_unit_id,'blocked',p_cleaning_task_id=>p_cleaning_task_id,
    p_maintenance_request_id=>v_request_id,p_room_inspection_id=>v_inspection_id,p_note=>v_note);
  return query select v_request_id,v_inspection_id,v_created,'blocked'::public.room_operational_status;
end;
$$;
revoke all on function public.fn_mark_inspection_blocking_problem(uuid,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.fn_mark_inspection_blocking_problem(uuid,text,uuid,uuid) to authenticated;

create or replace function public.fn_create_manual_booking(
  p_room_unit_id uuid,p_full_name text,p_phone text,p_email text,p_check_in date,p_check_out date,
  p_adults integer,p_children integer,p_extra_beds integer,p_source public.lead_source,p_total_amount_kgs numeric,p_notes text
)
returns table (booking_id uuid,booking_number text,customer_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_customer_id uuid; v_booking_id uuid; v_booking_number text; v_room record;
begin
  if v_user_id is null or not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'manual_booking_not_authorized' using errcode='42501'; end if;
  if nullif(btrim(p_full_name),'') is null then raise exception 'full_name_required' using errcode='22023'; end if;
  if nullif(btrim(p_phone),'') is null then raise exception 'phone_required' using errcode='22023'; end if;
  if p_check_in is null or p_check_out is null or p_check_out<=p_check_in then raise exception 'invalid_booking_dates' using errcode='22023'; end if;
  if coalesce(p_adults,0)<1 or coalesce(p_children,0)<0 or coalesce(p_extra_beds,0)<0 then raise exception 'invalid_guest_counts' using errcode='22023'; end if;
  if coalesce(p_total_amount_kgs,0)<0 then raise exception 'invalid_total_amount' using errcode='22023'; end if;
  select id,max_capacity,extra_places,sellable_status,operational_status into v_room
  from public.room_units where id=p_room_unit_id and deleted_at is null for update;
  if not found then raise exception 'room_not_found' using errcode='22023'; end if;
  if v_room.sellable_status<>'active' then raise exception 'room_not_sellable' using errcode='22023'; end if;
  if v_room.operational_status in ('maintenance_required','maintenance_in_progress','blocked') then raise exception 'room_operationally_blocked' using errcode='22023'; end if;
  if p_adults+p_children>v_room.max_capacity then raise exception 'room_capacity_exceeded' using errcode='22023'; end if;
  if p_extra_beds>v_room.extra_places then raise exception 'extra_bed_capacity_exceeded' using errcode='22023'; end if;
  insert into public.customers (full_name,phone,email,preferred_contact)
  values (btrim(p_full_name),btrim(p_phone),nullif(btrim(coalesce(p_email,'')),''),'whatsapp')
  on conflict (phone) do update set full_name=excluded.full_name,
    email=coalesce(excluded.email,public.customers.email),updated_at=now()
  where public.customers.deleted_at is null returning id into v_customer_id;
  if v_customer_id is null then raise exception 'customer_phone_belongs_to_deleted_record' using errcode='23505'; end if;
  insert into public.bookings (booking_number,customer_id,status,check_in,check_out,adults,children,source,
    total_amount_kgs,prepayment_required_kgs,notes,created_by)
  values (null,v_customer_id,'pending_confirmation',p_check_in,p_check_out,p_adults,p_children,
    coalesce(p_source,'manual'),coalesce(p_total_amount_kgs,0),round(coalesce(p_total_amount_kgs,0)*0.20,2),
    nullif(btrim(coalesce(p_notes,'')),''),v_user_id)
  returning id,bookings.booking_number into v_booking_id,v_booking_number;
  insert into public.booking_rooms (booking_id,room_unit_id,check_in,check_out,adults,children,extra_beds,status)
  values (v_booking_id,p_room_unit_id,p_check_in,p_check_out,p_adults,p_children,p_extra_beds,'active');
  return query select v_booking_id,v_booking_number,v_customer_id;
end;
$$;
revoke all on function public.fn_create_manual_booking(uuid,text,text,text,date,date,integer,integer,integer,public.lead_source,numeric,text) from public, anon, authenticated;
grant execute on function public.fn_create_manual_booking(uuid,text,text,text,date,date,integer,integer,integer,public.lead_source,numeric,text) to authenticated;

create or replace function public.fn_create_availability_hold(
  p_room_unit_id uuid,p_check_in date,p_check_out date,p_held_by uuid,p_lead_id uuid default null,p_idempotency_key text default null
)
returns public.availability_holds language plpgsql security definer set search_path=public,pg_temp as $$
declare v_range daterange; v_existing public.availability_holds; v_hold public.availability_holds; v_service boolean:=auth.role()='service_role';
begin
  if p_check_in is null or p_check_out is null or p_check_out<=p_check_in then raise exception 'invalid_date_range' using errcode='AKB01'; end if;
  if p_held_by is null or not exists (
    select 1 from public.profiles p join public.user_roles ur on ur.user_id=p.id and ur.deleted_at is null
    join public.roles r on r.id=ur.role_id where p.id=p_held_by and p.is_active=true and p.deleted_at is null
      and r.name in ('owner','administrator','manager')) then
    raise exception 'hold_actor_not_authorized' using errcode='42501'; end if;
  if not v_service then
    if auth.uid() is null or auth.uid()<>p_held_by or not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
      raise exception 'hold_actor_mismatch' using errcode='42501'; end if;
  end if;
  v_range:=daterange(p_check_in,p_check_out,'[)');
  if not exists (select 1 from public.room_units where id=p_room_unit_id and deleted_at is null
      and sellable_status='active' and operational_status='ready') then
    raise exception 'invalid_room' using errcode='AKB03'; end if;
  if p_idempotency_key is not null then
    select * into v_existing from public.availability_holds where idempotency_key=p_idempotency_key;
    if found then
      if v_existing.room_unit_id<>p_room_unit_id or v_existing.date_range<>v_range or v_existing.held_by<>p_held_by then
        raise exception 'idempotency_key_conflict' using errcode='AKB02'; end if;
      return v_existing;
    end if;
  end if;
  update public.availability_holds set status='expired'
  where room_unit_id=p_room_unit_id and status='active' and expires_at<=now();
  insert into public.availability_holds (room_unit_id,lead_id,date_range,status,held_by,expires_at,idempotency_key)
  values (p_room_unit_id,p_lead_id,v_range,'active',p_held_by,now()+interval '60 minutes',p_idempotency_key)
  returning * into v_hold;
  return v_hold;
exception
  when unique_violation then
    if p_idempotency_key is not null then
      select * into v_existing from public.availability_holds where idempotency_key=p_idempotency_key;
      if found then
        if v_existing.room_unit_id<>p_room_unit_id or v_existing.date_range<>v_range or v_existing.held_by<>p_held_by then
          raise exception 'idempotency_key_conflict' using errcode='AKB02'; end if;
        return v_existing;
      end if;
    end if;
    raise;
  when exclusion_violation then raise exception 'hold_conflict' using errcode='23P01';
end;
$$;
revoke all on function public.fn_create_availability_hold(uuid,date,date,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.fn_create_availability_hold(uuid,date,date,uuid,uuid,text) to authenticated, service_role;

create or replace function public.fn_advance_booking_status(
  p_booking_id uuid,p_new_status public.booking_status,p_note text default null
)
returns public.booking_status language plpgsql security definer set search_path=public,pg_temp as $$
declare v_current public.booking_status;
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'fn_advance_booking_status: active management role required' using errcode='42501'; end if;
  select status into v_current from public.bookings where id=p_booking_id and deleted_at is null for update;
  if not found then raise exception 'fn_advance_booking_status: booking not found' using errcode='22023'; end if;
  if not ((v_current='pending_confirmation' and p_new_status='confirmed')
       or (v_current='confirmed' and p_new_status='checked_in')
       or (v_current='checked_in' and p_new_status='checked_out')) then
    raise exception 'fn_advance_booking_status: transition not allowed' using errcode='22023'; end if;
  update public.bookings set status=p_new_status,
    confirmed_by=case when p_new_status='confirmed' then auth.uid() else confirmed_by end,
    confirmed_at=case when p_new_status='confirmed' then now() else confirmed_at end,
    notes=case when nullif(btrim(coalesce(p_note,'')),'') is null then notes
               when notes is null or notes='' then btrim(p_note)
               else notes || E'\n' || btrim(p_note) end
  where id=p_booking_id;
  return p_new_status;
end;
$$;
revoke all on function public.fn_advance_booking_status(uuid,public.booking_status,text) from public, anon, authenticated;
grant execute on function public.fn_advance_booking_status(uuid,public.booking_status,text) to authenticated;
