-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0017: Operational Row-Level Security
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0011-0016.
--
-- Every table created by 0012-0016 gets RLS enabled AND at least one
-- explicit, role-scoped policy in this file — same discipline as Phase
-- 1's 0008_rls_policies.sql. No table is left permissive ("true") and
-- none is left enabled-but-policy-less.
--
-- Design note that applies to every mutating action in this file: almost
-- every write path for these tables goes through a SECURITY DEFINER RPC
-- in 0016 (fn_accept_cleaning_task, fn_start_maintenance_request, etc.),
-- which re-checks assignment/role ownership in PL/pgSQL and then writes
-- as the function owner, bypassing RLS entirely (same pattern Phase 1
-- used for occupancy_periods and audit_log). Consequently most tables
-- below get SELECT policies for staff roles but deliberately NO direct
-- INSERT/UPDATE/DELETE policy for housekeeping/technician — their only
-- way to change these rows is by calling the matching RPC. This is a
-- stronger guarantee than a same-table RLS check would give, because it
-- means "housekeeping can accept/start/complete/report problems" and
-- "technician can diagnose/record work/complete" are enforced once, in
-- one function each, not re-derived per policy.
--
-- Public (anon) access: none of the tables in this file grant anon
-- anything, select or write. There is no operational-CRM use case for
-- the public website role, per the task's "no broad anonymous access"
-- requirement.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- room_status_transitions: read-only reference data (the transition
-- graph). Staff may read it (useful for UI validation); only owner/
-- administrator may ever change the graph itself, and only via a
-- reviewed migration, never application traffic.
-- ---------------------------------------------------------------------

alter table public.room_status_transitions enable row level security;
create policy room_status_transitions_staff_select on public.room_status_transitions for select
  using (public.is_staff());

-- ---------------------------------------------------------------------
-- cleaning_tasks
-- ---------------------------------------------------------------------

alter table public.cleaning_tasks enable row level security;
create policy cleaning_tasks_admin_all on public.cleaning_tasks for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));
create policy cleaning_tasks_manager_select on public.cleaning_tasks for select
  using (public.has_role('manager'));
create policy cleaning_tasks_housekeeping_select on public.cleaning_tasks for select
  using (
    public.has_role('housekeeping')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id = cleaning_tasks.id
        and sa.staff_id = auth.uid()
        and sa.released_at is null
    )
  );
comment on policy cleaning_tasks_housekeeping_select on public.cleaning_tasks is
  '"Housekeeping sees only assigned tasks". No direct UPDATE policy for '
  'housekeeping — accept/start/complete/report-problem all go through the '
  'SECURITY DEFINER RPCs in 0016, which perform this exact same '
  'staff_assignments check before writing.';

-- ---------------------------------------------------------------------
-- cleaning_task_history — append-only, populated by trigger only.
-- ---------------------------------------------------------------------

alter table public.cleaning_task_history enable row level security;
create policy cleaning_task_history_admin_select on public.cleaning_task_history for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy cleaning_task_history_housekeeping_select on public.cleaning_task_history for select
  using (
    public.has_role('housekeeping')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id = cleaning_task_history.cleaning_task_id
        and sa.staff_id = auth.uid()
    )
  );
-- No write policy for any role: rows are inserted only by
-- trg_cleaning_tasks_history (0012), firing under the same transaction
-- as whichever role/function updated cleaning_tasks.status.

-- ---------------------------------------------------------------------
-- maintenance_requests
-- ---------------------------------------------------------------------

alter table public.maintenance_requests enable row level security;
create policy maintenance_requests_admin_all on public.maintenance_requests for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));
create policy maintenance_requests_manager_select on public.maintenance_requests for select
  using (public.has_role('manager'));
create policy maintenance_requests_technician_select on public.maintenance_requests for select
  using (
    public.has_role('technician')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id = maintenance_requests.id
        and sa.staff_id = auth.uid()
        and sa.released_at is null
    )
  );
-- Housekeeping may see requests they personally reported (their own
-- "report problem" tickets), read-only, so they can follow up.
create policy maintenance_requests_reporter_select on public.maintenance_requests for select
  using (public.has_role('housekeeping') and reported_by = auth.uid());
comment on policy maintenance_requests_technician_select on public.maintenance_requests is
  '"Technician sees only assigned repair requests". No direct UPDATE '
  'policy for technician — diagnose/record-work/complete all go through '
  'the SECURITY DEFINER RPCs in 0016. Closing a request '
  '(fn_close_maintenance_request) is restricted inside that function to '
  'owner/administrator/manager, independent of this table''s RLS.';

-- ---------------------------------------------------------------------
-- maintenance_work_logs
-- ---------------------------------------------------------------------

alter table public.maintenance_work_logs enable row level security;
create policy maintenance_work_logs_admin_select on public.maintenance_work_logs for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy maintenance_work_logs_technician_select on public.maintenance_work_logs for select
  using (
    public.has_role('technician')
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id = maintenance_work_logs.maintenance_request_id
        and sa.staff_id = auth.uid()
    )
  );
-- No write policy: rows are inserted only via fn_record_maintenance_work_log (0016).

-- ---------------------------------------------------------------------
-- room_inspections
-- ---------------------------------------------------------------------

alter table public.room_inspections enable row level security;
create policy room_inspections_admin_all on public.room_inspections for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy room_inspections_housekeeping_select on public.room_inspections for select
  using (
    public.has_role('housekeeping')
    and cleaning_task_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id = room_inspections.cleaning_task_id
        and sa.staff_id = auth.uid()
    )
  );
create policy room_inspections_technician_select on public.room_inspections for select
  using (
    public.has_role('technician')
    and maintenance_request_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id = room_inspections.maintenance_request_id
        and sa.staff_id = auth.uid()
    )
  );
-- No write policy: rows are inserted only via fn_record_room_inspection
-- (0016), restricted there to owner/administrator/manager. Housekeeping/
-- technician read their own task's inspection result (pass/fail feedback)
-- but can never self-certify.

-- ---------------------------------------------------------------------
-- staff_assignments
-- ---------------------------------------------------------------------

alter table public.staff_assignments enable row level security;
create policy staff_assignments_admin_all on public.staff_assignments for all
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy staff_assignments_self_select on public.staff_assignments for select
  using (staff_id = auth.uid());
comment on policy staff_assignments_admin_all on public.staff_assignments is
  'Dispatch (create/reassign) is a management action per '
  'fn_assign_staff''s own role check (0016); this ALL policy lets '
  'owner/administrator/manager read and directly correct assignment rows '
  'for exceptional cases. Housekeeping/technician get SELECT of their own '
  'rows only (staff_assignments_self_select) — their accept/start/'
  'complete actions still go through the RPCs, which check staff_id = '
  'auth.uid() themselves before writing, so this table has no direct '
  'staff write policy at all.';

-- ---------------------------------------------------------------------
-- task_attachments — before/after and result photos.
-- ---------------------------------------------------------------------

alter table public.task_attachments enable row level security;
create policy task_attachments_admin_select on public.task_attachments for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

create policy task_attachments_housekeeping_select on public.task_attachments for select
  using (
    public.has_role('housekeeping')
    and cleaning_task_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id = task_attachments.cleaning_task_id and sa.staff_id = auth.uid()
    )
  );
create policy task_attachments_housekeeping_insert on public.task_attachments for insert
  to authenticated
  with check (
    public.has_role('housekeeping')
    and entity_type = 'cleaning_task'
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.staff_assignments sa
      where sa.cleaning_task_id = task_attachments.cleaning_task_id
        and sa.staff_id = auth.uid()
        and sa.released_at is null
    )
  );
comment on policy task_attachments_housekeeping_insert on public.task_attachments is
  '"Housekeeping can... upload before/after photos": direct INSERT (not '
  'an RPC) because uploading a photo has no state-machine side effect to '
  'protect — unlike accept/start/complete, it never changes '
  'cleaning_tasks.status or room_units.operational_status, so a plain '
  'RLS-scoped insert is sufficient and simpler.';

create policy task_attachments_technician_select on public.task_attachments for select
  using (
    public.has_role('technician')
    and maintenance_request_id is not null
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id = task_attachments.maintenance_request_id and sa.staff_id = auth.uid()
    )
  );
create policy task_attachments_technician_insert on public.task_attachments for insert
  to authenticated
  with check (
    public.has_role('technician')
    and entity_type = 'maintenance_request'
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.staff_assignments sa
      where sa.maintenance_request_id = task_attachments.maintenance_request_id
        and sa.staff_id = auth.uid()
        and sa.released_at is null
    )
  );
comment on policy task_attachments_technician_insert on public.task_attachments is
  '"Technician can... upload result photos" (result/diagnostic phases).';

create policy task_attachments_inspector_insert on public.task_attachments for insert
  to authenticated
  with check (
    (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
    and entity_type = 'room_inspection'
    and uploaded_by = auth.uid()
  );

-- ---------------------------------------------------------------------
-- room_status_history — system-managed, written only by
-- fn_transition_room_status (0016). No client write policy for any role,
-- same governance posture as Phase 1's audit_log.
-- ---------------------------------------------------------------------

alter table public.room_status_history enable row level security;
create policy room_status_history_staff_select on public.room_status_history for select
  using (public.is_staff());
comment on policy room_status_history_staff_select on public.room_status_history is
  'Broader read access than most operational tables (all staff, not just '
  'owner/administrator/manager) because room status is operationally '
  'relevant to housekeeping and technicians deciding what to work on next '
  '— but still authenticated staff only, never anon. "All status changes '
  'must be audited" is satisfied by this table having no write policy at '
  'all outside fn_transition_room_status.';

-- ---------------------------------------------------------------------
-- operational_notifications — a recipient reads and acknowledges only
-- their own notifications.
-- ---------------------------------------------------------------------

alter table public.operational_notifications enable row level security;
create policy operational_notifications_self_select on public.operational_notifications for select
  using (recipient_id = auth.uid());
create policy operational_notifications_admin_select on public.operational_notifications for select
  using (public.has_role('owner') or public.has_role('administrator'));
-- No INSERT/UPDATE policy for any role: rows are created only by the
-- fn_notify_role()/fn_notify_user() helpers (0016, SECURITY DEFINER), and
-- the is_read flag is only ever flipped through fn_mark_notification_read
-- (0016), which checks recipient_id = auth.uid() itself.

commit;
