-- Durable, version-fenced Google Sheets booking occupancy. Prepared only;
-- this migration is not executed by this task. Depends on migrations through
-- 20260804000100_availability_hold_security.sql.

begin;

-- This table intentionally does not fabricate public.bookings rows: Sheets
-- does not provide the required customer, price, or approval evidence. It
-- stores only the stable external booking identity and fields needed to
-- project authoritative availability blocking into occupancy_periods.
create table public.sheets_booking_occupancies (
  id uuid primary key default gen_random_uuid(),
  external_booking_id text not null unique,
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  source_status text not null,
  blocks_availability boolean not null,
  source_updated_at timestamptz not null,
  event_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(external_booking_id)) between 1 and 500),
  check (check_out > check_in),
  check (source_status in (
    'pre_hold', 'waiting_prepayment', 'paid', 'confirmed', 'checked_in',
    'checking_out', 'no_show', 'cancelled'
  )),
  check (blocks_availability = (source_status in (
    'pre_hold', 'waiting_prepayment', 'paid', 'confirmed', 'checked_in',
    'checking_out'
  ))),
  check (event_fingerprint ~ '^[0-9a-f]{64}$')
);

create trigger trg_sheets_booking_occupancies_updated_at
  before update on public.sheets_booking_occupancies
  for each row execute function public.set_updated_at();

alter table public.sheets_booking_occupancies enable row level security;
create policy sheets_booking_occupancies_admin_select
  on public.sheets_booking_occupancies for select
  using (public.has_role('owner') or public.has_role('administrator'));

-- A Sheets booking uses the existing 'booking' occupancy type but has its own
-- exclusive source FK. This preserves the original occupancy enum and the
-- single GiST exclusion authority without inventing a CRM booking header.
alter table public.occupancy_periods
  add column sheets_booking_occupancy_id uuid
  references public.sheets_booking_occupancies(id) on delete cascade;

alter table public.occupancy_periods
  drop constraint occupancy_periods_single_source;

alter table public.occupancy_periods
  add constraint occupancy_periods_single_source check (
    (period_type = 'booking'
      and ((booking_room_id is not null and sheets_booking_occupancy_id is null)
        or (booking_room_id is null and sheets_booking_occupancy_id is not null))
      and availability_hold_id is null and room_block_id is null)
    or
    (period_type = 'hold'
      and availability_hold_id is not null and booking_room_id is null
      and room_block_id is null and sheets_booking_occupancy_id is null)
    or
    (period_type in ('maintenance_block', 'stop_sale')
      and room_block_id is not null and booking_room_id is null
      and availability_hold_id is null and sheets_booking_occupancy_id is null)
  );

create unique index occupancy_periods_active_sheets_booking_key
  on public.occupancy_periods (sheets_booking_occupancy_id)
  where sheets_booking_occupancy_id is not null and status = 'active';

create or replace function public.sync_sheets_booking_occupancy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'DELETE' or new.blocks_availability = false then
    update public.occupancy_periods
      set status = 'cancelled'
      where sheets_booking_occupancy_id = coalesce(old.id, new.id)
        and status = 'active';
    return coalesce(new, old);
  end if;

  update public.occupancy_periods
    set room_unit_id = new.room_unit_id,
        period = daterange(new.check_in, new.check_out, '[)')
    where sheets_booking_occupancy_id = new.id and status = 'active';

  if not found then
    insert into public.occupancy_periods
      (room_unit_id, period, period_type, sheets_booking_occupancy_id)
    values
      (new.room_unit_id, daterange(new.check_in, new.check_out, '[)'),
       'booking', new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_sheets_booking_occupancy() from public;

create trigger trg_sheets_booking_occupancy
  after insert or update of room_unit_id, check_in, check_out, blocks_availability
  or delete on public.sheets_booking_occupancies
  for each row execute function public.sync_sheets_booking_occupancy();

-- Apply one source event under a stable-id lock. Older events are acknowledged
-- without mutation. Equal-version identical events are replays; an equal
-- timestamp with different content is ambiguous and fails closed.
create or replace function public.fn_apply_sheets_booking_event(
  p_external_booking_id text,
  p_room_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_source_status text,
  p_blocks_availability boolean,
  p_source_updated_at timestamptz,
  p_event_fingerprint text
)
returns public.sheets_booking_occupancies
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing public.sheets_booking_occupancies;
  v_result public.sheets_booking_occupancies;
begin
  if p_external_booking_id is null or length(btrim(p_external_booking_id)) = 0
    or p_room_unit_id is null or p_check_in is null or p_check_out is null
    or p_check_out <= p_check_in or p_source_status is null
    or p_blocks_availability is null or p_source_updated_at is null
    or p_source_status not in (
      'pre_hold', 'waiting_prepayment', 'paid', 'confirmed', 'checked_in',
      'checking_out', 'no_show', 'cancelled'
    )
    or p_blocks_availability <> (p_source_status in (
      'pre_hold', 'waiting_prepayment', 'paid', 'confirmed', 'checked_in',
      'checking_out'
    ))
    or p_event_fingerprint is null
    or p_event_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'owner_action_required: incomplete Sheets booking event'
      using errcode = 'AKB04';
  end if;

  if not exists (
    select 1 from public.room_units
    where id = p_room_unit_id and deleted_at is null
  ) then
    raise exception 'owner_action_required: explicit room mapping is invalid'
      using errcode = 'AKB04';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(btrim(p_external_booking_id), 0)
  );

  select * into v_existing
    from public.sheets_booking_occupancies
    where external_booking_id = btrim(p_external_booking_id)
    for update;

  if found then
    if p_source_updated_at < v_existing.source_updated_at then
      return v_existing;
    end if;

    if p_source_updated_at = v_existing.source_updated_at then
      if v_existing.room_unit_id = p_room_unit_id
        and v_existing.check_in = p_check_in
        and v_existing.check_out = p_check_out
        and v_existing.source_status = p_source_status
        and v_existing.blocks_availability = p_blocks_availability
        and v_existing.event_fingerprint = p_event_fingerprint then
        return v_existing;
      end if;
      raise exception 'owner_action_required: ambiguous equal-version Sheets event'
        using errcode = 'AKB04';
    end if;

    update public.sheets_booking_occupancies
      set room_unit_id = p_room_unit_id,
          check_in = p_check_in,
          check_out = p_check_out,
          source_status = p_source_status,
          blocks_availability = p_blocks_availability,
          source_updated_at = p_source_updated_at,
          event_fingerprint = p_event_fingerprint
      where id = v_existing.id
      returning * into v_result;
    return v_result;
  end if;

  insert into public.sheets_booking_occupancies
    (external_booking_id, room_unit_id, check_in, check_out, source_status,
     blocks_availability, source_updated_at, event_fingerprint)
  values
    (btrim(p_external_booking_id), p_room_unit_id, p_check_in, p_check_out,
     p_source_status, p_blocks_availability, p_source_updated_at,
     p_event_fingerprint)
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.fn_apply_sheets_booking_event(
  text, uuid, date, date, text, boolean, timestamptz, text
) from public;
revoke all on function public.fn_apply_sheets_booking_event(
  text, uuid, date, date, text, boolean, timestamptz, text
) from anon;
revoke all on function public.fn_apply_sheets_booking_event(
  text, uuid, date, date, text, boolean, timestamptz, text
) from authenticated;
grant execute on function public.fn_apply_sheets_booking_event(
  text, uuid, date, date, text, boolean, timestamptz, text
) to service_role;

-- The snapshot and hold share one transaction. Every event is version-fenced
-- before the existing atomic hold function is called; any mapping, event, or
-- occupancy conflict aborts the transaction and prevents the hold.
create or replace function public.fn_sync_sheets_bookings_and_create_availability_hold(
  p_events jsonb,
  p_room_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_held_by uuid,
  p_lead_id uuid default null,
  p_idempotency_key text default null
)
returns public.availability_holds
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_event jsonb;
  v_hold public.availability_holds;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'owner_action_required: Sheets booking events must be an array'
      using errcode = 'AKB04';
  end if;

  for v_event in
    select value
    from jsonb_array_elements(p_events)
    order by value ->> 'external_booking_id'
  loop
    perform public.fn_apply_sheets_booking_event(
      v_event ->> 'external_booking_id',
      (v_event ->> 'room_unit_id')::uuid,
      (v_event ->> 'check_in')::date,
      (v_event ->> 'check_out')::date,
      v_event ->> 'source_status',
      (v_event ->> 'blocks_availability')::boolean,
      (v_event ->> 'source_updated_at')::timestamptz,
      v_event ->> 'event_fingerprint'
    );
  end loop;

  v_hold := public.fn_create_availability_hold(
    p_room_unit_id, p_check_in, p_check_out, p_held_by, p_lead_id,
    p_idempotency_key
  );
  return v_hold;
end;
$$;

revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, uuid, date, date, uuid, uuid, text
) from public;
revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, uuid, date, date, uuid, uuid, text
) from anon;
revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, uuid, date, date, uuid, uuid, text
) from authenticated;
grant execute on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, uuid, date, date, uuid, uuid, text
) to service_role;

comment on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, uuid, date, date, uuid, uuid, text
) is 'Service-role-only transaction: version-fenced Sheets booking occupancy synchronization followed by the existing atomic availability hold RPC.';

commit;
