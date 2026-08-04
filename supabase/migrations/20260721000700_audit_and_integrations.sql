-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0007: Audit & Integrations
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0006.
--
-- Phase 1 scope: audit_log, integration_events, Google Sheets
-- synchronization queue (sheets_sync_queue), synchronization history
-- (sheets_sync_history).
-- =====================================================================

begin;

-- audit_log: generic, append-only, covers everything not already
-- captured by a dedicated *_status_history table (role grants, room_units
-- edits, booking edits, manual data corrections). Governance requirement
-- from day one: role grants must be audited before any staff accounts
-- are created.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_entity on public.audit_log(entity_table, entity_id);
create index idx_audit_log_actor on public.audit_log(actor_id, created_at desc);

comment on table public.audit_log is
  'Populated by fn_audit_row_change(), a generic SECURITY DEFINER trigger '
  'function attached below to the Phase 1 sensitive tables (user_roles, '
  'roles, room_units, bookings), rather than one bespoke trigger per '
  'table. Dedicated *_status_history tables (lead_status_history, '
  'booking_status_history) remain the primary read path for their own '
  'domains; audit_log is the catch-all and the compliance/forensics path, '
  'not a UI data source. No insert/update/delete policy is granted to any '
  'role in 0008 — this table is written only by the trigger function '
  'below, running as its definer, never directly by application-role '
  'users, staff or otherwise.';

create or replace function public.fn_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    auth.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce((new).id, (old).id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

comment on function public.fn_audit_row_change() is
  'Generic row-change auditor. SECURITY DEFINER so it can write to '
  'audit_log regardless of the calling role''s own RLS grants; search_path '
  'pinned to public to avoid search-path hijacking in a SECURITY DEFINER '
  'function.';

create trigger trg_audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_roles
  after insert or update or delete on public.roles
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_room_units
  after insert or update or delete on public.room_units
  for each row execute function public.fn_audit_row_change();

create trigger trg_audit_bookings
  after insert or update or delete on public.bookings
  for each row execute function public.fn_audit_row_change();

-- integration_events: generic inbox/outbox for any external system call
-- (Google Sheets write, FreedomPay callback, WhatsApp webhook).
create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index idx_integration_events_unprocessed on public.integration_events(created_at)
  where processed_at is null;

-- sheets_sync_queue: outbound queue, Supabase -> Google Sheets (the
-- recommended post-cutover direction per architecture report Section 14).
-- A row here means "this Supabase change needs to be reflected in
-- Sheets"; a worker (Edge Function / cron) drains it. This package
-- creates the queue table only — no worker is deployed and no Google
-- Sheet is read, written, or otherwise touched.
create table public.sheets_sync_queue (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id uuid not null,
  target_sheet text not null,
  direction public.sync_direction not null default 'supabase_to_sheets',
  status public.sync_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index idx_sheets_sync_pending on public.sheets_sync_queue(created_at) where status = 'pending';

-- sheets_sync_history: append-only record of completed sync attempts, for
-- diagnosing drift and supporting the rollback/shadow-read phases.
create table public.sheets_sync_history (
  id uuid primary key default gen_random_uuid(),
  sync_queue_id uuid references public.sheets_sync_queue(id) on delete set null,
  entity_table text not null,
  entity_id uuid not null,
  direction public.sync_direction not null,
  status public.sync_status not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

commit;
