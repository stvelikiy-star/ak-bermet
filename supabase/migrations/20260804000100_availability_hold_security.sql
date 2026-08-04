-- Correct the availability-hold RPC privilege boundary and serialize all
-- hold creation for a room. This migration intentionally replaces only the
-- function introduced by 20260728000100_availability_hold_atomicity.sql.

begin;

create or replace function public.fn_create_availability_hold(
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
  v_range daterange;
  v_idempotency_key text;
  v_existing public.availability_holds;
  v_hold public.availability_holds;
begin
  if p_check_in is null or p_check_out is null then
    raise exception 'invalid_date_range: check_in and check_out are required'
      using errcode = 'AKB01';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'invalid_date_range: check_out must be after check_in'
      using errcode = 'AKB01';
  end if;
  v_range := daterange(p_check_in, p_check_out, '[)');

  v_idempotency_key := btrim(p_idempotency_key);
  if v_idempotency_key is null or length(v_idempotency_key) = 0
    or length(v_idempotency_key) > 200 then
    raise exception 'invalid_idempotency_key: key is required and must be at most 200 characters'
      using errcode = 'AKB05';
  end if;

  -- A row lock is the per-room serialization point. It is deliberately
  -- acquired before idempotency lookup, expiration, and insertion so two
  -- callers cannot interleave cleanup and creation for the same room.
  perform 1
    from public.room_units ru
    where ru.id = p_room_unit_id
      and ru.deleted_at is null
      and ru.sellable_status = 'active'
      and ru.operational_status = 'ready'
    for update;
  if not found then
    raise exception 'invalid_room: room not found, deleted, not sellable, or not ready'
      using errcode = 'AKB03';
  end if;

  -- For a still-eligible room, replay returns the original row, including
  -- after that hold was expired, released, or converted. Reusing a key for
  -- another logical hold remains an explicit caller error.
  if v_idempotency_key is not null then
    select * into v_existing
      from public.availability_holds
      where idempotency_key = v_idempotency_key;
    if found then
      if v_existing.room_unit_id <> p_room_unit_id
        or v_existing.date_range <> v_range then
        raise exception 'idempotency_key_conflict: key already used for a different hold'
          using errcode = 'AKB06';
      end if;
      return v_existing;
    end if;
  end if;

  update public.availability_holds
    set status = 'expired'
    where room_unit_id = p_room_unit_id
      and status = 'active'
      and expires_at <= now();

  insert into public.availability_holds
    (room_unit_id, lead_id, date_range, status, held_by, expires_at, idempotency_key)
  values
    (p_room_unit_id, p_lead_id, v_range, 'active', p_held_by,
     now() + interval '60 minutes', v_idempotency_key)
  returning * into v_hold;

  return v_hold;
exception
  when unique_violation then
    -- The unique partial index created in 20260728000100 arbitrates a race
    -- between equal idempotency keys used for different rooms. Same-request
    -- replay returns the winner; different arguments return AKB06.
    if v_idempotency_key is not null then
      select * into v_existing
        from public.availability_holds
        where idempotency_key = v_idempotency_key;
      if found then
        if v_existing.room_unit_id <> p_room_unit_id
          or v_existing.date_range <> v_range then
          raise exception 'idempotency_key_conflict: key already used for a different hold'
            using errcode = 'AKB06';
        end if;
        return v_existing;
      end if;
    end if;
    raise;
  when exclusion_violation then
    -- The occupancy_periods GiST exclusion constraint remains the final,
    -- transaction-safe authority for booking/hold/block overlap.
    raise exception 'hold_conflict: room already held or booked for the requested dates'
      using errcode = '23P01';
end;
$$;

-- CREATE OR REPLACE preserves old ACLs, so explicitly remove both the
-- default PUBLIC grant and the historical authenticated grant. The standard
-- Supabase service_role already has the server-side table privileges and RLS
-- bypass documented by 20260721000800; no SECURITY DEFINER escalation is
-- necessary.
revoke all on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) from public;
revoke all on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) from anon;
revoke all on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) from authenticated;
grant execute on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) to service_role;

-- RLS policy holds_staff_all was created when staff-side direct writes were
-- still anticipated. PostgreSQL requires both a table grant and a passing RLS
-- policy, so remove the DML grants explicitly: an authenticated REST client
-- must not bypass room readiness, mandatory idempotency, expiration cleanup,
-- or the authenticated server identity enforced by the service-role route.
revoke insert, update, delete on table public.availability_holds from anon;
revoke insert, update, delete on table public.availability_holds from authenticated;

comment on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) is
  'Service-role-only, invoker-rights hold creation. Locks the eligible room, '
  'expires stale holds, and creates a 60-minute half-open hold while retaining '
  'idempotent replay and occupancy exclusion-conflict protection.';

commit;
