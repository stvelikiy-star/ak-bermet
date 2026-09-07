-- SUPER CHESSBOARD V2 live-UAT repair.
-- The RETURNS TABLE output name `booking_id` is a PL/pgSQL variable, so the
-- active-room count must qualify the booking_rooms columns explicitly.

create or replace function public.fn_move_booking_room(
  p_booking_room_id uuid,
  p_target_room_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_reason text default null
)
returns table (
  booking_id uuid,
  booking_room_id uuid,
  room_unit_id uuid,
  check_in date,
  check_out date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking_room public.booking_rooms%rowtype;
  v_booking public.bookings%rowtype;
  v_target public.room_units%rowtype;
  v_active_room_count integer;
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  ) then
    raise exception 'booking_move_not_authorized' using errcode = '42501';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_booking_dates' using errcode = '22023';
  end if;

  select br.* into v_booking_room
  from public.booking_rooms br
  where br.id = p_booking_room_id
  for update;

  if not found or v_booking_room.status <> 'active' then
    raise exception 'booking_room_not_found' using errcode = '22023';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = v_booking_room.booking_id
    and b.deleted_at is null
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;

  if v_booking.status not in ('pending_confirmation', 'confirmed') then
    raise exception 'booking_move_status_not_allowed' using errcode = '22023';
  end if;

  select ru.* into v_target
  from public.room_units ru
  where ru.id = p_target_room_unit_id
    and ru.deleted_at is null
  for update;

  if not found then
    raise exception 'room_not_found' using errcode = '22023';
  end if;

  if v_target.sellable_status <> 'active' then
    raise exception 'room_not_sellable' using errcode = '22023';
  end if;

  if v_target.operational_status in ('maintenance_required', 'maintenance_in_progress', 'blocked') then
    raise exception 'room_operationally_blocked' using errcode = '22023';
  end if;

  if v_booking_room.adults + v_booking_room.children > v_target.max_capacity then
    raise exception 'room_capacity_exceeded' using errcode = '22023';
  end if;

  if v_booking_room.extra_beds > v_target.extra_places then
    raise exception 'extra_bed_capacity_exceeded' using errcode = '22023';
  end if;

  if v_booking_room.room_unit_id = p_target_room_unit_id
     and v_booking_room.check_in = p_check_in
     and v_booking_room.check_out = p_check_out then
    return query
      select v_booking.id, v_booking_room.id, v_booking_room.room_unit_id,
             v_booking_room.check_in, v_booking_room.check_out;
    return;
  end if;

  update public.booking_rooms
  set room_unit_id = p_target_room_unit_id,
      check_in = p_check_in,
      check_out = p_check_out
  where id = v_booking_room.id;

  select count(*) into v_active_room_count
  from public.booking_rooms br_active
  where br_active.booking_id = v_booking.id
    and br_active.status = 'active';

  if v_active_room_count = 1 then
    update public.bookings
    set check_in = p_check_in,
        check_out = p_check_out
    where id = v_booking.id;
  end if;

  insert into public.booking_room_change_history (
    booking_room_id,
    booking_id,
    old_room_unit_id,
    new_room_unit_id,
    old_check_in,
    old_check_out,
    new_check_in,
    new_check_out,
    reason,
    changed_by
  ) values (
    v_booking_room.id,
    v_booking.id,
    v_booking_room.room_unit_id,
    p_target_room_unit_id,
    v_booking_room.check_in,
    v_booking_room.check_out,
    p_check_in,
    p_check_out,
    nullif(btrim(coalesce(p_reason, '')), ''),
    v_user_id
  );

  return query
    select v_booking.id, v_booking_room.id, p_target_room_unit_id, p_check_in, p_check_out;
end;
$$;

revoke all on function public.fn_move_booking_room(uuid, uuid, date, date, text) from public;
revoke execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) from anon;
grant execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) to authenticated;
grant execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) to service_role;
