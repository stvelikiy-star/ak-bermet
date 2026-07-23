-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0006: Booking Integrity
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0005.
--
-- This file is the single most important object in the Phase 1 package.
-- It implements every item in the task's Integrity Requirements list:
--   - invalid booking date ranges       -> check constraints (0003, 0005,
--                                          this file)
--   - duplicate public identifiers      -> unique(lead_number) (0004),
--                                          unique(booking_number) (0005)
--   - overlapping confirmed bookings    -> occupancy_periods EXCLUDE
--   - overlapping active holds          -> occupancy_periods EXCLUDE
--   - technical blocks                  -> occupancy_periods EXCLUDE
--   - maintenance blocks                -> occupancy_periods EXCLUDE
--   - stop-sale periods                 -> occupancy_periods EXCLUDE
--   - expired holds                     -> hold_status lifecycle +
--                                          fn_expire_holds() sweep below
--   - confirmation race conditions      -> occupancy_periods EXCLUDE
--                                          (23P01 on the losing writer)
--
-- Design: one unified table (occupancy_periods) + one PostgreSQL EXCLUDE
-- constraint, not per-table ad hoc checks. A naive SELECT-then-INSERT
-- check is racy under concurrent requests; EXCLUDE USING gist is enforced
-- by the storage engine itself at commit time, for every writer,
-- unconditionally. See AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN_REPORT.md
-- Section 7 for full rationale.
-- =====================================================================

begin;

-- availability_holds: short-lived pre-hold while a manager negotiates
-- with a guest. Expires automatically (see fn_expire_holds below).
create table public.availability_holds (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  date_range daterange not null,
  status public.hold_status not null default 'active',
  held_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (not isempty(date_range))
);
create trigger trg_holds_updated_at before update on public.availability_holds
  for each row execute function public.set_updated_at();
create index idx_holds_room on public.availability_holds(room_unit_id) where status = 'active';
create index idx_holds_expiry on public.availability_holds(expires_at) where status = 'active';
comment on table public.availability_holds is
  'Never delete hold rows — status transition only (active -> converted |'
  ' released | expired), so the negotiation history is auditable. '
  'fn_expire_holds() below is the recommended sweep; schedule it via '
  'Supabase pg_cron or an Edge Function on a timer (a few minutes) — this '
  'package prepares the function but does not schedule or invoke it.';

-- occupancy_periods: THE single source of truth for "is this room taken
-- on this date, for any reason". Every booking_rooms row, every active
-- availability_holds row, and every active room_blocks row projects
-- exactly one row here.
create table public.occupancy_periods (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  period daterange not null,
  period_type public.occupancy_period_type not null,
  status public.occupancy_period_status not null default 'active',
  booking_room_id uuid references public.booking_rooms(id) on delete cascade,
  availability_hold_id uuid references public.availability_holds(id) on delete cascade,
  room_block_id uuid references public.room_blocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occupancy_periods_single_source check (
    (period_type = 'booking'
      and booking_room_id is not null and availability_hold_id is null and room_block_id is null)
    or
    (period_type = 'hold'
      and availability_hold_id is not null and booking_room_id is null and room_block_id is null)
    or
    (period_type in ('maintenance_block', 'stop_sale')
      and room_block_id is not null and booking_room_id is null and availability_hold_id is null)
  ),
  exclude using gist (room_unit_id with =, period with &&) where (status = 'active')
);
create trigger trg_occupancy_updated_at before update on public.occupancy_periods
  for each row execute function public.set_updated_at();
create index idx_occupancy_room on public.occupancy_periods(room_unit_id) where status = 'active';
comment on table public.occupancy_periods is
  'The EXCLUDE constraint raises SQLSTATE 23P01 (exclusion_violation) on '
  'any attempted overlap for the same room while status=active, covering '
  'bookings vs bookings, bookings vs holds, holds vs holds, and any of the '
  'above vs a maintenance/technical/stop-sale block — in a single '
  'constraint, enforced regardless of which table or code path created the '
  'row. Application code MUST catch 23P01 and surface "room no longer '
  'available" rather than treating it as an unexpected error; this is a '
  'required implementation detail, not an optional nicety.';

-- ---------------------------------------------------------------------
-- Triggers keeping occupancy_periods in sync with its three sources.
-- All three trigger functions are SECURITY DEFINER: occupancy_periods is
-- system-managed and never targeted by a direct application INSERT/
-- UPDATE, so no role is granted direct write access to it in 0008 (staff
-- get SELECT only). SECURITY DEFINER lets the projection happen
-- regardless of the calling role's own RLS grants on occupancy_periods,
-- the same pattern used for fn_audit_row_change() in 0007.
-- ---------------------------------------------------------------------

create or replace function public.sync_booking_room_occupancy()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or new.status <> 'active' then
    update public.occupancy_periods
      set status = 'cancelled'
      where booking_room_id = coalesce(old.id, new.id) and status = 'active';
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into public.occupancy_periods (room_unit_id, period, period_type, booking_room_id)
    values (new.room_unit_id, daterange(new.check_in, new.check_out, '[)'), 'booking', new.id);
  else
    update public.occupancy_periods
      set room_unit_id = new.room_unit_id,
          period = daterange(new.check_in, new.check_out, '[)')
      where booking_room_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;
create trigger trg_booking_rooms_occupancy
  after insert or update of status, room_unit_id, check_in, check_out or delete on public.booking_rooms
  for each row execute function public.sync_booking_room_occupancy();

create or replace function public.sync_hold_occupancy()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or new.status <> 'active' then
    update public.occupancy_periods
      set status = 'released'
      where availability_hold_id = coalesce(old.id, new.id) and status = 'active';
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into public.occupancy_periods (room_unit_id, period, period_type, availability_hold_id)
    values (new.room_unit_id, new.date_range, 'hold', new.id);
  end if;
  return new;
end;
$$;
create trigger trg_holds_occupancy
  after insert or update of status on public.availability_holds
  for each row execute function public.sync_hold_occupancy();

create or replace function public.sync_block_occupancy()
returns trigger language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.occupancy_period_type;
begin
  if tg_op = 'DELETE' or new.is_active = false then
    update public.occupancy_periods
      set status = 'cancelled'
      where room_block_id = coalesce(old.id, new.id) and status = 'active';
    return coalesce(new, old);
  end if;

  v_type := case when new.block_type = 'stop_sale' then 'stop_sale' else 'maintenance_block' end;
  if tg_op = 'INSERT' then
    insert into public.occupancy_periods (room_unit_id, period, period_type, room_block_id)
    values (new.room_unit_id, new.date_range, v_type, new.id);
  end if;
  return new;
end;
$$;
create trigger trg_room_blocks_occupancy
  after insert or update of is_active on public.room_blocks
  for each row execute function public.sync_block_occupancy();

-- ---------------------------------------------------------------------
-- Expired-hold sweep (prepared, NOT scheduled or invoked by this
-- package). Recommended invocation: Supabase pg_cron every few minutes,
-- or a timed Edge Function. Marking a hold 'expired' flips its trigger
-- above, which releases the corresponding occupancy_periods row.
-- ---------------------------------------------------------------------

create or replace function public.fn_expire_holds()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.availability_holds
    set status = 'expired'
    where status = 'active' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.fn_expire_holds() is
  'Sweeps active holds past expires_at to status=expired. Not scheduled '
  'by this package (no pg_cron job or Edge Function is created here) — '
  'wiring the schedule is a manual approval point, see the package README.';

commit;
