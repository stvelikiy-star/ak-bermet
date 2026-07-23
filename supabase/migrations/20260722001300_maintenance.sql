-- =====================================================================
-- AK BERMET — Phase 2 Migration — 0013: Maintenance
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0011, 0012.
--
-- Tables: maintenance_requests, maintenance_work_logs.
-- Also resolves the forward reference Phase 1's 0003_inventory.sql left
-- open on public.room_blocks: "maintenance_request_id is intentionally
-- NOT a column here... When that later package ships, it will add a
-- nullable maintenance_request_id column + FK to this table." This file
-- is that later package.
-- =====================================================================

begin;

-- maintenance_requests: reported problem -> ticket. Independent of the
-- cleaning workflow (a problem can be reported outside of a checkout/
-- clean, e.g. a housekeeping problem-report or a guest complaint).
-- blocks_room = true means the room must not be sellable while the
-- ticket is open (operational_status becomes 'blocked', not merely
-- 'maintenance_required') — enforced by fn_transition_room_status (0016),
-- and made unbookable at the calendar level via the room_blocks row
-- created below, which projects into Phase 1's occupancy_periods EXCLUDE
-- constraint exactly like any other block.
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  cleaning_task_id uuid references public.cleaning_tasks(id) on delete set null, -- set when reported via a cleaning_task's "report problem" path
  reported_by uuid references public.profiles(id),
  description text not null,
  priority public.maintenance_priority not null default 'normal',
  status public.maintenance_status not null default 'reported',
  blocks_room boolean not null default false,
  diagnosis text,
  diagnosed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  resulting_operational_status public.room_operational_status, -- decided at close time: 'inspection_required' or 'ready'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_at is null or resulting_operational_status is not null),
  check (resulting_operational_status is null
    or resulting_operational_status in ('inspection_required', 'ready'))
);
create trigger trg_maintenance_requests_updated_at before update on public.maintenance_requests
  for each row execute function public.set_updated_at();
create index idx_maintenance_requests_room on public.maintenance_requests(room_unit_id);
create index idx_maintenance_requests_open on public.maintenance_requests(status)
  where status not in ('closed', 'cancelled');
comment on table public.maintenance_requests is
  'status is only ever changed through the fn_accept_maintenance_request / '
  'fn_start_maintenance_request / fn_complete_maintenance_request RPCs in '
  '0016, which also drive room_units.operational_status, the linked '
  'room_blocks row, and room_status_history together.';

create or replace function public.set_maintenance_request_number()
returns trigger language plpgsql as $$
begin
  new.request_number := public.generate_public_number('MNT', 'maintenance_request_number_seq');
  return new;
end;
$$;
create trigger trg_maintenance_requests_public_number before insert on public.maintenance_requests
  for each row when (new.request_number is null)
  execute procedure public.set_maintenance_request_number();

-- Resolves the Phase 1 forward reference on room_blocks (0003).
alter table public.room_blocks
  add column maintenance_request_id uuid
    references public.maintenance_requests(id) on delete set null;
create index idx_room_blocks_maintenance on public.room_blocks(maintenance_request_id)
  where maintenance_request_id is not null;
comment on column public.room_blocks.maintenance_request_id is
  'Populated only for block_type = ''maintenance'' rows created by '
  'fn_accept_maintenance_request()/fn_report_maintenance_problem() (0016) '
  'when maintenance_requests.blocks_room = true. Manual technical/'
  'stop_sale/owner_use blocks (created directly by owner/administrator, '
  'per Phase 1) leave this column null.';

-- maintenance_work_logs: append-only log of diagnosis, work performed,
-- and materials consumed. Multiple rows per request (a technician logs
-- as they go) rather than a handful of nullable columns on
-- maintenance_requests itself — this is the "record work and materials"
-- requirement and doubles as the cost-tracking source.
create table public.maintenance_work_logs (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  technician_id uuid not null references public.profiles(id),
  log_type public.work_log_type not null,
  description text,
  material_name text,
  quantity numeric(10,2),
  unit text,
  cost_kgs numeric(10,2),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (log_type <> 'material_used' or material_name is not null),
  check (quantity is null or quantity > 0),
  check (cost_kgs is null or cost_kgs >= 0)
);
create index idx_maintenance_work_logs_request on public.maintenance_work_logs(maintenance_request_id, logged_at);
comment on table public.maintenance_work_logs is
  'log_type=''diagnosis'' rows implement "technician can diagnose"; '
  '''work_performed'' rows implement "record work"; ''material_used'' '
  'rows implement "record materials" (quantity/unit/cost_kgs populated). '
  'Never updated or deleted once inserted — a correction is a new row, '
  'not an edit, so the work history stays a faithful record for cost '
  'reporting and dispute resolution.';

commit;
