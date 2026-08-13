-- =====================================================================
-- AK BERMET — Supabase -> Google Sheets durable outbox plumbing
-- =====================================================================
-- Supabase/PostgreSQL remains the only authoritative operational store.
-- This migration only queues committed database changes for a secondary
-- asynchronous Sheets mirror. It does not call Google APIs and it does not
-- make Google Sheets a writable source of truth.
-- =====================================================================

begin;

-- Existing Phase 1 queue rows did not need a claim timestamp because no worker
-- existed yet. A real worker needs one so an interrupted claim can be safely
-- recovered instead of remaining `in_progress` forever.
alter table public.sheets_sync_queue
  add column if not exists claimed_at timestamptz;

create index if not exists idx_sheets_sync_stale_claims
  on public.sheets_sync_queue(claimed_at)
  where status = 'in_progress';

create or replace function public.fn_enqueue_sheets_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity_id uuid;
  v_target_sheet text;
begin
  v_target_sheet := nullif(btrim(coalesce(tg_argv[0], '')), '');
  if v_target_sheet is null then
    raise exception 'Sheets mirror target is required for %.%', tg_table_schema, tg_table_name;
  end if;

  if tg_op = 'DELETE' then
    v_entity_id := old.id;
  else
    v_entity_id := new.id;
  end if;

  if v_entity_id is null then
    raise exception 'Sheets mirror entity id is required for %.%', tg_table_schema, tg_table_name;
  end if;

  insert into public.sheets_sync_queue (
    entity_table,
    entity_id,
    target_sheet,
    direction,
    status
  )
  values (
    tg_table_name,
    v_entity_id,
    v_target_sheet,
    'supabase_to_sheets',
    'pending'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.fn_enqueue_sheets_sync() is
  'Internal trigger helper. Enqueues authoritative Supabase row changes for the secondary one-way Google Sheets mirror.';

revoke all on function public.fn_enqueue_sheets_sync() from public, anon, authenticated;
grant execute on function public.fn_enqueue_sheets_sync() to service_role;

-- Claim a bounded batch atomically. SKIP LOCKED lets multiple workers run
-- without claiming the same queue row. A claim older than 15 minutes is
-- considered abandoned and can be reclaimed after a worker crash.
create or replace function public.fn_claim_sheets_sync_batch(
  p_limit integer default 25
)
returns setof public.sheets_sync_queue
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;

  return query
  with claimed as (
    select q.id
    from public.sheets_sync_queue q
    where q.direction = 'supabase_to_sheets'
      and (
        q.status = 'pending'
        or (
          q.status = 'in_progress'
          and (q.claimed_at is null or q.claimed_at < now() - interval '15 minutes')
        )
      )
    order by q.created_at, q.id
    for update skip locked
    limit p_limit
  )
  update public.sheets_sync_queue q
  set status = 'in_progress',
      attempts = q.attempts + 1,
      last_error = null,
      claimed_at = now(),
      processed_at = null
  from claimed
  where q.id = claimed.id
  returning q.*;
end;
$$;

comment on function public.fn_claim_sheets_sync_batch(integer) is
  'Service-role worker RPC. Atomically claims pending or abandoned Supabase-to-Sheets queue rows using FOR UPDATE SKIP LOCKED.';

revoke all on function public.fn_claim_sheets_sync_batch(integer) from public, anon, authenticated;
grant execute on function public.fn_claim_sheets_sync_batch(integer) to service_role;

-- Finish one claimed attempt. Failed attempts are returned to pending until
-- the bounded retry budget is exhausted; every attempt is appended to history.
create or replace function public.fn_finish_sheets_sync(
  p_queue_id uuid,
  p_success boolean,
  p_error text default null,
  p_detail jsonb default null,
  p_max_attempts integer default 5
)
returns public.sync_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.sheets_sync_queue%rowtype;
  v_queue_status public.sync_status;
  v_attempt_status public.sync_status;
begin
  if p_queue_id is null then
    raise exception 'p_queue_id is required';
  end if;
  if p_success is null then
    raise exception 'p_success is required';
  end if;
  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 20 then
    raise exception 'p_max_attempts must be between 1 and 20';
  end if;

  select *
  into v_item
  from public.sheets_sync_queue
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'Sheets sync queue item not found';
  end if;
  if v_item.direction <> 'supabase_to_sheets' then
    raise exception 'Unsupported Sheets sync direction';
  end if;
  if v_item.status <> 'in_progress' then
    raise exception 'Sheets sync queue item is not in_progress';
  end if;

  if p_success then
    v_queue_status := 'success';
    v_attempt_status := 'success';
  else
    v_attempt_status := 'failed';
    if v_item.attempts >= p_max_attempts then
      v_queue_status := 'failed';
    else
      v_queue_status := 'pending';
    end if;
  end if;

  update public.sheets_sync_queue
  set status = v_queue_status,
      last_error = case when p_success then null else left(coalesce(p_error, 'Sheets mirror attempt failed'), 1000) end,
      claimed_at = null,
      processed_at = case when p_success or v_queue_status = 'failed' then now() else null end
  where id = p_queue_id;

  insert into public.sheets_sync_history (
    sync_queue_id,
    entity_table,
    entity_id,
    direction,
    status,
    detail
  )
  values (
    v_item.id,
    v_item.entity_table,
    v_item.entity_id,
    v_item.direction,
    v_attempt_status,
    coalesce(p_detail, '{}'::jsonb) || jsonb_build_object(
      'attempt', v_item.attempts,
      'queue_status', v_queue_status,
      'target_sheet', v_item.target_sheet,
      'error', case when p_success then null else left(coalesce(p_error, 'Sheets mirror attempt failed'), 1000) end
    )
  );

  return v_queue_status;
end;
$$;

comment on function public.fn_finish_sheets_sync(uuid, boolean, text, jsonb, integer) is
  'Service-role worker RPC. Records an immutable attempt history and either completes, retries, or terminally fails a claimed Sheets mirror item.';

revoke all on function public.fn_finish_sheets_sync(uuid, boolean, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.fn_finish_sheets_sync(uuid, boolean, text, jsonb, integer) to service_role;

-- The worker will always re-read the current authoritative row by UUID before
-- writing Sheets. Queue payloads intentionally contain no PII or row snapshot.
-- Repeated updates therefore remain safe and eventually converge to DB state.

drop trigger if exists trg_sheets_sync_buildings on public.buildings;
create trigger trg_sheets_sync_buildings
after insert or update or delete on public.buildings
for each row execute function public.fn_enqueue_sheets_sync('Корпуса');

drop trigger if exists trg_sheets_sync_room_units on public.room_units;
create trigger trg_sheets_sync_room_units
after insert or update or delete on public.room_units
for each row execute function public.fn_enqueue_sheets_sync('Номера');

drop trigger if exists trg_sheets_sync_customers on public.customers;
create trigger trg_sheets_sync_customers
after insert or update or delete on public.customers
for each row execute function public.fn_enqueue_sheets_sync('Клиенты');

drop trigger if exists trg_sheets_sync_bookings on public.bookings;
create trigger trg_sheets_sync_bookings
after insert or update or delete on public.bookings
for each row execute function public.fn_enqueue_sheets_sync('Бронирования');

drop trigger if exists trg_sheets_sync_booking_rooms on public.booking_rooms;
create trigger trg_sheets_sync_booking_rooms
after insert or update or delete on public.booking_rooms
for each row execute function public.fn_enqueue_sheets_sync('05_Бронь_Номера');

drop trigger if exists trg_sheets_sync_availability_holds on public.availability_holds;
create trigger trg_sheets_sync_availability_holds
after insert or update or delete on public.availability_holds
for each row execute function public.fn_enqueue_sheets_sync('06_Удержания');

drop trigger if exists trg_sheets_sync_cleaning_tasks on public.cleaning_tasks;
create trigger trg_sheets_sync_cleaning_tasks
after insert or update or delete on public.cleaning_tasks
for each row execute function public.fn_enqueue_sheets_sync('Уборка');

drop trigger if exists trg_sheets_sync_maintenance_requests on public.maintenance_requests;
create trigger trg_sheets_sync_maintenance_requests
after insert or update or delete on public.maintenance_requests
for each row execute function public.fn_enqueue_sheets_sync('Ремонт');

drop trigger if exists trg_sheets_sync_room_inspections on public.room_inspections;
create trigger trg_sheets_sync_room_inspections
after insert or update or delete on public.room_inspections
for each row execute function public.fn_enqueue_sheets_sync('10_Проверки');

commit;