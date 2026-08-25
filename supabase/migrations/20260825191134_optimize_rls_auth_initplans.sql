alter policy cleaning_task_history_housekeeping_select on public.cleaning_task_history
to authenticated
using (
  public.has_role('housekeeping')
  and exists (
    select 1 from public.staff_assignments sa
    where sa.cleaning_task_id = cleaning_task_history.cleaning_task_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy cleaning_tasks_housekeeping_select on public.cleaning_tasks
to authenticated
using (
  public.has_role('housekeeping')
  and exists (
    select 1 from public.staff_assignments sa
    where sa.cleaning_task_id = cleaning_tasks.id
      and sa.staff_id = (select auth.uid())
      and sa.released_at is null
  )
);

alter policy maintenance_requests_reporter_select on public.maintenance_requests
to authenticated
using (
  public.has_role('housekeeping')
  and reported_by = (select auth.uid())
);

alter policy maintenance_requests_technician_select on public.maintenance_requests
to authenticated
using (
  public.has_role('technician')
  and exists (
    select 1 from public.staff_assignments sa
    where sa.maintenance_request_id = maintenance_requests.id
      and sa.staff_id = (select auth.uid())
      and sa.released_at is null
  )
);

alter policy maintenance_work_logs_technician_select on public.maintenance_work_logs
to authenticated
using (
  public.has_role('technician')
  and exists (
    select 1 from public.staff_assignments sa
    where sa.maintenance_request_id = maintenance_work_logs.maintenance_request_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy operational_notifications_self_select on public.operational_notifications
to authenticated
using (recipient_id = (select auth.uid()));

alter policy profiles_self_select on public.profiles
to authenticated
using (
  id = (select auth.uid())
  or public.has_role('owner')
  or public.has_role('administrator')
);

alter policy profiles_self_update on public.profiles
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy room_inspections_housekeeping_select on public.room_inspections
to authenticated
using (
  public.has_role('housekeeping')
  and cleaning_task_id is not null
  and exists (
    select 1 from public.staff_assignments sa
    where sa.cleaning_task_id = room_inspections.cleaning_task_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy room_inspections_technician_select on public.room_inspections
to authenticated
using (
  public.has_role('technician')
  and maintenance_request_id is not null
  and exists (
    select 1 from public.staff_assignments sa
    where sa.maintenance_request_id = room_inspections.maintenance_request_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy staff_assignments_self_select on public.staff_assignments
to authenticated
using (staff_id = (select auth.uid()));

alter policy staff_assignments_self_select on public.staff_property_assignments
to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role('owner')
  or public.has_role('administrator')
);

alter policy task_attachments_housekeeping_select on public.task_attachments
to authenticated
using (
  public.has_role('housekeeping')
  and cleaning_task_id is not null
  and exists (
    select 1 from public.staff_assignments sa
    where sa.cleaning_task_id = task_attachments.cleaning_task_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy task_attachments_technician_select on public.task_attachments
to authenticated
using (
  public.has_role('technician')
  and maintenance_request_id is not null
  and exists (
    select 1 from public.staff_assignments sa
    where sa.maintenance_request_id = task_attachments.maintenance_request_id
      and sa.staff_id = (select auth.uid())
  )
);

alter policy user_roles_self_select on public.user_roles
to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role('owner')
  or public.has_role('administrator')
);
