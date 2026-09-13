create or replace function public.fn_advance_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_note text default null
)
returns public.booking_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.booking_status;
  v_check_in date;
  v_prepayment_required numeric(12,2);
  v_paid numeric(12,2);
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'management_role_required' using errcode = '42501';
  end if;

  select status, check_in, prepayment_required_kgs
    into v_current, v_check_in, v_prepayment_required
  from public.bookings
  where id = p_booking_id and deleted_at is null
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;

  if v_current = 'pending_confirmation' and p_new_status = 'confirmed' then
    select coalesce(sum(amount_kgs), 0)
      into v_paid
    from public.booking_payments
    where booking_id = p_booking_id
      and status = 'confirmed'
      and deleted_at is null;

    if v_paid < v_prepayment_required then
      raise exception 'prepayment_required' using errcode = '22023';
    end if;

    update public.bookings
       set status = 'confirmed',
           confirmed_by = auth.uid(),
           confirmed_at = now(),
           notes = case
             when nullif(btrim(coalesce(p_note, '')), '') is null then notes
             when notes is null or notes = '' then btrim(p_note)
             else notes || E'\n' || btrim(p_note)
           end
     where id = p_booking_id;

  elsif v_current = 'confirmed' and p_new_status = 'checked_in' then
    if (now() at time zone 'Asia/Bishkek')::date < v_check_in then
      raise exception 'check_in_too_early' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.booking_rooms br
      join public.room_units ru on ru.id = br.room_unit_id
      where br.booking_id = p_booking_id
        and br.status = 'active'
        and (
          ru.deleted_at is not null
          or ru.sellable_status <> 'active'
          or ru.operational_status <> 'ready'
        )
    ) then
      raise exception 'room_not_ready_for_check_in' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.booking_rooms
      where booking_id = p_booking_id and status = 'active'
    ) then
      raise exception 'booking_room_missing' using errcode = '22023';
    end if;

    update public.bookings
       set status = 'checked_in',
           notes = case
             when nullif(btrim(coalesce(p_note, '')), '') is null then notes
             when notes is null or notes = '' then btrim(p_note)
             else notes || E'\n' || btrim(p_note)
           end
     where id = p_booking_id;

  elsif v_current = 'checked_in' and p_new_status = 'checked_out' then
    update public.bookings
       set status = 'checked_out',
           notes = case
             when nullif(btrim(coalesce(p_note, '')), '') is null then notes
             when notes is null or notes = '' then btrim(p_note)
             else notes || E'\n' || btrim(p_note)
           end
     where id = p_booking_id;

  else
    raise exception 'transition_not_allowed' using errcode = '22023';
  end if;

  return p_new_status;
end;
$$;

create or replace function public.fn_terminate_booking(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_reason text default null
)
returns public.booking_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.booking_status;
  v_check_in date;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then
    raise exception 'management_role_required' using errcode = '42501';
  end if;

  if p_new_status not in ('cancelled'::public.booking_status, 'no_show'::public.booking_status) then
    raise exception 'invalid_terminal_status' using errcode = '22023';
  end if;

  if v_reason is not null and length(v_reason) > 1000 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;

  select status, check_in
    into v_current, v_check_in
  from public.bookings
  where id = p_booking_id and deleted_at is null
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;

  if p_new_status = 'cancelled' then
    if v_current not in ('pending_confirmation'::public.booking_status, 'confirmed'::public.booking_status) then
      raise exception 'transition_not_allowed' using errcode = '22023';
    end if;
    if v_reason is null then
      raise exception 'cancellation_reason_required' using errcode = '22023';
    end if;
  else
    if v_current <> 'confirmed'::public.booking_status then
      raise exception 'transition_not_allowed' using errcode = '22023';
    end if;
    if (now() at time zone 'Asia/Bishkek')::date < v_check_in then
      raise exception 'no_show_too_early' using errcode = '22023';
    end if;
    if v_reason is null then
      v_reason := 'Гость не заехал';
    end if;
  end if;

  update public.booking_rooms
     set status = 'cancelled'
   where booking_id = p_booking_id
     and status = 'active';

  update public.bookings
     set status = p_new_status,
         cancelled_at = case when p_new_status = 'cancelled' then now() else cancelled_at end,
         cancellation_reason = case when p_new_status = 'cancelled' then v_reason else cancellation_reason end,
         notes = case
           when v_reason is null then notes
           when notes is null or notes = '' then
             case when p_new_status = 'no_show' then 'NO-SHOW: ' || v_reason else 'CANCELLED: ' || v_reason end
           else notes || E'\n' || case when p_new_status = 'no_show' then 'NO-SHOW: ' || v_reason else 'CANCELLED: ' || v_reason end
         end
   where id = p_booking_id;

  return p_new_status;
end;
$$;

revoke all on function public.fn_terminate_booking(uuid, public.booking_status, text)
  from public, anon;
grant execute on function public.fn_terminate_booking(uuid, public.booking_status, text)
  to authenticated;
