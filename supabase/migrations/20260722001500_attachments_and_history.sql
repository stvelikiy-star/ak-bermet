-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0015: Attachments & History
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0011-0014.
--
-- Tables: task_attachments, room_status_history, operational_notifications.
-- =====================================================================

begin;

-- task_attachments: one generic table for every before/after/diagnostic/
-- result photo, instead of separate cleaning_photos/maintenance_photos
-- tables as originally sketched in AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql
-- Section 8. Modeled the same way occupancy_periods (Phase 1 0006)
-- disambiguates its three possible sources: entity_type plus three
-- nullable FK columns with a check constraint pinning exactly the right
-- one, so referential integrity is enforced by a real FK (not a bare
-- polymorphic uuid with no constraint).
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type public.attachment_entity_type not null,
  cleaning_task_id uuid references public.cleaning_tasks(id) on delete cascade,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete cascade,
  room_inspection_id uuid references public.room_inspections(id) on delete cascade,
  phase public.attachment_phase not null default 'after',
  storage_path text not null, -- Supabase Storage object path; bucket access is gated by Storage policies mirroring 0017, not modeled in SQL here
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (
    (entity_type = 'cleaning_task' and cleaning_task_id is not null
      and maintenance_request_id is null and room_inspection_id is null)
    or
    (entity_type = 'maintenance_request' and maintenance_request_id is not null
      and cleaning_task_id is null and room_inspection_id is null)
    or
    (entity_type = 'room_inspection' and room_inspection_id is not null
      and cleaning_task_id is null and maintenance_request_id is null)
  )
);
create index idx_task_attachments_cleaning on public.task_attachments(cleaning_task_id)
  where cleaning_task_id is not null;
create index idx_task_attachments_maintenance on public.task_attachments(maintenance_request_id)
  where maintenance_request_id is not null;
create index idx_task_attachments_inspection on public.task_attachments(room_inspection_id)
  where room_inspection_id is not null;
comment on table public.task_attachments is
  '"Upload before/after photos" (housekeeping) and "upload result photos" '
  '(technician) both insert here with entity_type/phase set accordingly. '
  'storage_path points into Supabase Storage; this package does not '
  'create or configure a Storage bucket — that is a Supabase-console/CLI '
  'action outside SQL migrations and is listed as a prerequisite in the '
  'package README, same as Phase 1 left Storage entirely out of scope.';

-- room_status_history: canonical, append-only audit trail of every
-- room_units.operational_status transition, across both the cleaning and
-- maintenance workflows. This supersedes/renames what
-- AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql Section 8 called
-- room_operational_status_history — same role, extended with an FK to
-- room_inspections since Phase 2 splits inspections into their own table.
--
-- Rows are inserted exclusively by fn_transition_room_status() (0016),
-- in the same transaction as the room_units update, so history always has
-- full context (which task/inspection caused the change) rather than
-- being reconstructed after the fact by a bare column-change trigger.
create table public.room_status_history (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  previous_status public.room_operational_status,
  status public.room_operational_status not null,
  changed_by uuid references public.profiles(id), -- null for system-triggered transitions (e.g. checkout)
  cleaning_task_id uuid references public.cleaning_tasks(id) on delete set null,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  room_inspection_id uuid references public.room_inspections(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_room_status_history_room on public.room_status_history(room_unit_id, created_at);
comment on table public.room_status_history is
  'This table plus fn_transition_room_status (0016) together satisfy '
  '"all status changes must be audited". No INSERT/UPDATE/DELETE policy '
  'is granted to any role in 0017 beyond the function itself (SECURITY '
  'DEFINER) — identical governance posture to Phase 1''s audit_log.';

-- operational_notifications: in-app notification outbox for staff. Not a
-- delivery channel (no email/SMS/push integration here) — a row means
-- "this staff member has something to look at", surfaced by the staff
-- app's own UI. Delivery fan-out (push, WhatsApp, etc.) is an application/
-- integration-layer concern using integration_events (Phase 1 0007), out
-- of scope for this table.
create table public.operational_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notification_type public.operational_notification_type not null,
  title text not null,
  body text,
  related_table text,
  related_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (is_read = false or read_at is not null)
);
create index idx_operational_notifications_unread on public.operational_notifications(recipient_id, created_at)
  where is_read = false;
comment on table public.operational_notifications is
  'Populated by the fn_notify_* helpers in 0016, triggered off '
  'staff_assignments inserts (new assignment), cleaning_tasks status '
  '-> problem_reported, maintenance_requests.blocks_room transitions, and '
  'room_inspections.result = ''failed''. Recipients mark their own rows '
  'read via the recipient-scoped RLS policy in 0017 — no admin write path '
  'is needed for is_read.';

commit;
