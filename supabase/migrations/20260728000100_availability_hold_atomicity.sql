-- =====================================================================
-- AK BERMET — Booking Holds — Atomic, Durable Hold Storage
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0008. Not applied to
-- any database by this task (see task AK_BERMET_3DAY_RELEASE_01 audit
-- follow-up) — created for review only.
--
-- Context: src/lib/availability.ts currently keeps every accepted
-- 60-minute hold in a process-local `Map`. Separate Next.js
-- workers/processes do not share that Map, so two workers can each
-- accept an overlapping hold, and every hold is lost on restart or
-- deploy. public.availability_holds / public.occupancy_periods (0006)
-- already model a durable, atomic hold store — this package closes the
-- two gaps needed to use them as the sole write path:
--
--   - idempotency_key: a repeated request (client retry after a
--     timeout, double-submit) with the same key returns the original
--     hold row instead of creating a duplicate or racing the EXCLUDE
--     constraint for its own retry.
--   - fn_create_availability_hold(): the single write path a caller
--     uses to create a hold. It validates the room, resolves
--     idempotency, expires stale holds for the room, and inserts the
--     new hold — all in one statement/transaction. Overlap with any
--     other active booking, hold, or maintenance/stop-sale block for the
--     room is rejected by the occupancy_periods EXCLUDE USING gist
--     constraint (0006) at commit time, not by application logic, so it
--     holds under concurrent callers across any number of processes.
--
-- NOT solved by this package (see task report): confirmed bookings are
-- currently sourced only from Google Sheets (pre-cutover, see
-- DECISIONS.md "Data migration"), and public.room_units has no seeded
-- rows and no mapping to the application's current string room
-- identifiers (e.g. "garden-lux-01"). Until both a room-inventory
-- mapping and a Sheets-to-Supabase booking sync exist, this schema
-- cannot see, and therefore cannot atomically protect against,
-- Sheets-only confirmed bookings. Wiring the live API to this function
-- before that gap is resolved would either fail every request (no
-- matching room_unit_id) or require inventing an unapproved mapping —
-- neither is done here.
-- =====================================================================

begin;

alter table public.availability_holds
  add column idempotency_key text;

-- One row per idempotency key: a caller retrying the same request (e.g.
-- after a client-side timeout) must get back the same hold, never a
-- duplicate and never a spurious EXCLUDE conflict against itself.
create unique index availability_holds_idempotency_key_key
  on public.availability_holds (idempotency_key)
  where idempotency_key is not null;

comment on column public.availability_holds.idempotency_key is
  'Client-supplied token for one hold-creation attempt. Repeated calls to '
  'fn_create_availability_hold with the same key return the original hold '
  'row; the same key reused for a different room/date range is rejected '
  'explicitly (AKB02) rather than silently returning an unrelated hold.';

-- fn_create_availability_hold: the single atomic write path for creating
-- a 60-minute hold. SECURITY INVOKER (not DEFINER): the calling role
-- already has full INSERT/UPDATE/SELECT on availability_holds via the
-- holds_staff_all RLS policy (0008), so no privilege escalation is
-- needed here — RLS keeps applying exactly as if the caller ran the
-- statements directly. search_path is pinned to block search_path
-- hijacking via a caller-controlled setting.
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
set search_path = public, pg_temp
as $$
declare
  v_range daterange;
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

  if not exists (
    select 1 from public.room_units
    where id = p_room_unit_id and deleted_at is null and sellable_status = 'active'
  ) then
    raise exception 'invalid_room: room not found or not sellable'
      using errcode = 'AKB03';
  end if;

  -- Idempotent replay: the same key always returns the same row, even if
  -- it has since expired/converted/released — the caller decides what to
  -- do with its current status. A key reused for a different room/date
  -- range is a caller bug, not a retry, so it is rejected explicitly.
  if p_idempotency_key is not null then
    select * into v_existing
      from public.availability_holds
      where idempotency_key = p_idempotency_key;
    if found then
      if v_existing.room_unit_id <> p_room_unit_id or v_existing.date_range <> v_range then
        raise exception 'idempotency_key_conflict: key already used for a different hold'
          using errcode = 'AKB02';
      end if;
      return v_existing;
    end if;
  end if;

  -- Expire stale holds for this room before checking/inserting, so an
  -- unswept-but-expired hold never blocks a legitimate new one. Scoped to
  -- the room to keep this a narrow, fast write; the periodic
  -- fn_expire_holds() sweep (0006) still runs separately for global
  -- housekeeping/reporting.
  update public.availability_holds
    set status = 'expired'
    where room_unit_id = p_room_unit_id
      and status = 'active'
      and expires_at <= now();

  insert into public.availability_holds
    (room_unit_id, lead_id, date_range, status, held_by, expires_at, idempotency_key)
  values
    (p_room_unit_id, p_lead_id, v_range, 'active', p_held_by, now() + interval '60 minutes', p_idempotency_key)
  returning * into v_hold;

  return v_hold;
exception
  when exclusion_violation then
    -- occupancy_periods EXCLUDE (0006): another active booking, hold, or
    -- block already covers an overlapping period for this room. This is
    -- the authoritative, concurrency-safe conflict check — it fires
    -- identically no matter how many processes call this function at
    -- once, unlike a SELECT-then-INSERT check in application code. 0006
    -- already documents that callers MUST treat 23P01 as "room no longer
    -- available"; re-raised here unchanged so that contract holds for
    -- every caller of this function too.
    raise exception 'hold_conflict: room already held or booked for the requested dates'
      using errcode = '23P01';
end;
$$;

revoke all on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) from public;
grant execute on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) to authenticated;

comment on function public.fn_create_availability_hold(uuid, date, date, uuid, uuid, text) is
  'Single atomic write path for creating a 60-minute availability hold. '
  'Prefer this over a direct INSERT into availability_holds: it adds '
  'idempotency-key replay and per-room expired-hold cleanup ahead of the '
  'insert, on top of the EXCLUDE-enforced overlap protection in 0006.';

commit;
