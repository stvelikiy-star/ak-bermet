drop policy if exists cleaning_task_history_admin_select on public.cleaning_task_history;
drop policy if exists cleaning_task_history_housekeeping_select on public.cleaning_task_history;
create policy cleaning_task_history_role_select on public.cleaning_task_history
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (
    public.has_role('housekeeping')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id=cleaning_task_history.cleaning_task_id
        and sa.staff_id=(select auth.uid())
    )
  )
);

drop policy if exists cleaning_tasks_admin_select on public.cleaning_tasks;
drop policy if exists cleaning_tasks_manager_select on public.cleaning_tasks;
drop policy if exists cleaning_tasks_housekeeping_select on public.cleaning_tasks;
create policy cleaning_tasks_role_select on public.cleaning_tasks
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (
    public.has_role('housekeeping')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id=cleaning_tasks.id
        and sa.staff_id=(select auth.uid())
        and sa.released_at is null
    )
  )
);

drop policy if exists maintenance_requests_admin_select on public.maintenance_requests;
drop policy if exists maintenance_requests_manager_select on public.maintenance_requests;
drop policy if exists maintenance_requests_reporter_select on public.maintenance_requests;
drop policy if exists maintenance_requests_technician_select on public.maintenance_requests;
create policy maintenance_requests_role_select on public.maintenance_requests
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (public.has_role('housekeeping') and reported_by=(select auth.uid()))
  or (
    public.has_role('technician')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id=maintenance_requests.id
        and sa.staff_id=(select auth.uid())
        and sa.released_at is null
    )
  )
);

drop policy if exists maintenance_work_logs_admin_select on public.maintenance_work_logs;
drop policy if exists maintenance_work_logs_technician_select on public.maintenance_work_logs;
create policy maintenance_work_logs_role_select on public.maintenance_work_logs
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (
    public.has_role('technician')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id=maintenance_work_logs.maintenance_request_id
        and sa.staff_id=(select auth.uid())
    )
  )
);

drop policy if exists operational_notifications_admin_select on public.operational_notifications;
drop policy if exists operational_notifications_self_select on public.operational_notifications;
create policy operational_notifications_role_select on public.operational_notifications
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator')
  or recipient_id=(select auth.uid())
);

drop policy if exists room_inspections_admin_all on public.room_inspections;
drop policy if exists room_inspections_housekeeping_select on public.room_inspections;
drop policy if exists room_inspections_technician_select on public.room_inspections;
create policy room_inspections_role_select on public.room_inspections
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (
    public.has_role('housekeeping')
    and cleaning_task_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id=room_inspections.cleaning_task_id
        and sa.staff_id=(select auth.uid())
    )
  )
  or (
    public.has_role('technician')
    and maintenance_request_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id=room_inspections.maintenance_request_id
        and sa.staff_id=(select auth.uid())
    )
  )
);

drop policy if exists staff_assignments_management_select on public.staff_assignments;
drop policy if exists staff_assignments_self_select on public.staff_assignments;
create policy staff_assignments_role_select on public.staff_assignments
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or staff_id=(select auth.uid())
);

drop policy if exists task_attachments_admin_select on public.task_attachments;
drop policy if exists task_attachments_housekeeping_select on public.task_attachments;
drop policy if exists task_attachments_technician_select on public.task_attachments;
create policy task_attachments_role_select on public.task_attachments
for select to authenticated
using (
  public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  or (
    public.has_role('housekeeping')
    and cleaning_task_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id=task_attachments.cleaning_task_id
        and sa.staff_id=(select auth.uid())
    )
  )
  or (
    public.has_role('technician')
    and maintenance_request_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id=task_attachments.maintenance_request_id
        and sa.staff_id=(select auth.uid())
    )
  )
);
