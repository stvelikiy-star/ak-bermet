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

-- A complete Sheets read is a snapshot, not an event stream. Keep a durable
-- fence so a delayed request which started reading earlier cannot reconcile
-- away rows already observed by a newer request. Retaining the scheduling
-- event contract makes an exact retry safe while treating two different
-- snapshots with the same timestamp as ambiguous.
create table public.sheets_booking_snapshot_state (
  singleton boolean primary key default true check (singleton),
  snapshot_started_at timestamptz,
  snapshot_events jsonb,
  updated_at timestamptz not null default now(),
  check (
    (snapshot_started_at is null and snapshot_events is null)
    or
    (snapshot_started_at is not null
      and snapshot_events is not null
      and jsonb_typeof(snapshot_events) = 'array')
  )
);

insert into public.sheets_booking_snapshot_state (singleton) values (true);

create trigger trg_sheets_booking_snapshot_state_updated_at
  before update on public.sheets_booking_snapshot_state
  for each row execute function public.set_updated_at();

alter table public.sheets_booking_snapshot_state enable row level security;
revoke all on table public.sheets_booking_snapshot_state from public;
revoke all on table public.sheets_booking_snapshot_state from anon;
revoke all on table public.sheets_booking_snapshot_state from authenticated;

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

    -- An expired hold may still have an active occupancy projection when the
    -- periodic sweep has not run (including immediately after a restart).
    -- Release it in this same transaction before a newer Sheets booking is
    -- projected, otherwise the stale GiST row would reject the booking event
    -- before fn_create_availability_hold gets its per-room cleanup chance.
    update public.availability_holds
      set status = 'expired'
      where room_unit_id = p_room_unit_id
        and status = 'active'
        and expires_at <= now();

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

  update public.availability_holds
    set status = 'expired'
    where room_unit_id = p_room_unit_id
      and status = 'active'
      and expires_at <= now();

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
  p_snapshot_started_at timestamptz,
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
  v_snapshot_state public.sheets_booking_snapshot_state;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'owner_action_required: Sheets booking events must be an array'
      using errcode = 'AKB04';
  end if;

  if p_snapshot_started_at is null
    or p_snapshot_started_at > clock_timestamp() + interval '5 minutes' then
    raise exception 'owner_action_required: invalid Sheets snapshot version'
      using errcode = 'AKB04';
  end if;

  -- The application produces one canonical event per stable booking id.
  -- Reject malformed or duplicate identities before any durable mutation.
  if exists (
      select 1 from jsonb_array_elements(p_events) as item(value)
      where jsonb_typeof(value) <> 'object'
        or nullif(btrim(value ->> 'external_booking_id'), '') is null
    )
    or (
      select count(*) from jsonb_array_elements(p_events)
    ) <> (
      select count(distinct btrim(value ->> 'external_booking_id'))
      from jsonb_array_elements(p_events)
    ) then
    raise exception 'owner_action_required: invalid Sheets snapshot identities'
      using errcode = 'AKB04';
  end if;

  -- This singleton row lock serializes complete snapshots across rooms and
  -- survives process restarts. Per-booking locks below still protect the
  -- event function when it is invoked independently.
  select * into v_snapshot_state
    from public.sheets_booking_snapshot_state
    where singleton = true
    for update;
  if not found then
    raise exception 'owner_action_required: Sheets snapshot fence is missing'
      using errcode = 'AKB04';
  end if;

  if v_snapshot_state.snapshot_started_at is not null then
    if p_snapshot_started_at < v_snapshot_state.snapshot_started_at then
      raise exception 'owner_action_required: stale Sheets snapshot'
        using errcode = 'AKB04';
    end if;

    if p_snapshot_started_at = v_snapshot_state.snapshot_started_at then
      if p_events <> v_snapshot_state.snapshot_events then
        raise exception 'owner_action_required: ambiguous Sheets snapshot version'
          using errcode = 'AKB04';
      end if;
      -- Exact retry is safe to rebuild. Doing so also repairs a missing
      -- projection if a separately managed recovery operation removed one.
    end if;
  end if;

  -- fn_apply_sheets_booking_event safely ignores an old standalone event, but
  -- a hold must not proceed from a complete snapshot which has regressed
  -- behind durable source state (for example, a delayed replica response).
  if exists (
    select 1
    from public.sheets_booking_occupancies as stored
    join jsonb_array_elements(p_events) as item(value)
      on btrim(value ->> 'external_booking_id') = stored.external_booking_id
    where (value ->> 'source_updated_at')::timestamptz
      < stored.source_updated_at
  ) then
    raise exception 'owner_action_required: stale Sheets booking version in snapshot'
      using errcode = 'AKB04';
  end if;

    -- Rebuild only the Sheets-owned projections as one snapshot. Releasing
    -- them first permits legitimate replacements and room/date swaps without
    -- colliding with the previous snapshot halfway through the transaction.
    -- Any later failure rolls this update back with the rest of the RPC.
    update public.occupancy_periods
      set status = 'cancelled'
      where sheets_booking_occupancy_id is not null
        and status = 'active';

    -- Rows absent from this complete snapshot are no longer authoritative.
    -- Deleting them also removes their now-cancelled projection through the
    -- FK path. This must happen before new events can claim released dates.
    delete from public.sheets_booking_occupancies as stored
      where not exists (
        select 1
        from jsonb_array_elements(p_events) as item(value)
        where btrim(value ->> 'external_booking_id') = stored.external_booking_id
      );

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

    -- Remove the cancelled pre-snapshot projections so repeated synchronization
    -- cannot accumulate one historical projection per booking per request.
    delete from public.occupancy_periods
      where sheets_booking_occupancy_id is not null
        and status = 'cancelled';

    -- Identical source-version replays intentionally do not UPDATE their
    -- durable row in fn_apply_sheets_booking_event. Touch the projection field
    -- after every event has settled so the trigger recreates those projections
    -- too. The shared GiST exclusion remains the final overlap authority.
    update public.sheets_booking_occupancies
      set blocks_availability = blocks_availability
      where blocks_availability = true;

    update public.sheets_booking_snapshot_state
      set snapshot_started_at = p_snapshot_started_at,
          snapshot_events = p_events
      where singleton = true;

  v_hold := public.fn_create_availability_hold(
    p_room_unit_id, p_check_in, p_check_out, p_held_by, p_lead_id,
    p_idempotency_key
  );
  return v_hold;
end;
$$;

revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, timestamptz, uuid, date, date, uuid, uuid, text
) from public;
revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, timestamptz, uuid, date, date, uuid, uuid, text
) from anon;
revoke all on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, timestamptz, uuid, date, date, uuid, uuid, text
) from authenticated;
grant execute on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, timestamptz, uuid, date, date, uuid, uuid, text
) to service_role;

comment on function public.fn_sync_sheets_bookings_and_create_availability_hold(
  jsonb, timestamptz, uuid, date, date, uuid, uuid, text
) is 'Service-role-only transaction: version-fenced Sheets booking occupancy synchronization followed by the existing atomic availability hold RPC.';

commit;
