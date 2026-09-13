alter table public.bookings
  add column if not exists termination_policy_code text,
  add column if not exists termination_days_before integer,
  add column if not exists termination_recorded_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_termination_policy_code_check;
alter table public.bookings
  add constraint bookings_termination_policy_code_check
  check (
    termination_policy_code is null or termination_policy_code in (
      'refund_review_7_plus',
      'non_refundable_under_7',
      'non_refundable_no_show'
    )
  );

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
  v_today date := (now() at time zone 'Asia/Bishkek')::date;
  v_days_before integer;
  v_policy_code text;
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

  v_days_before := v_check_in - v_today;

  if p_new_status = 'cancelled' then
    if v_current not in ('pending_confirmation'::public.booking_status, 'confirmed'::public.booking_status) then
      raise exception 'transition_not_allowed' using errcode = '22023';
    end if;
    if v_reason is null then
      raise exception 'cancellation_reason_required' using errcode = '22023';
    end if;
    v_policy_code := case
      when v_days_before >= 7 then 'refund_review_7_plus'
      else 'non_refundable_under_7'
    end;
  else
    if v_current <> 'confirmed'::public.booking_status then
      raise exception 'transition_not_allowed' using errcode = '22023';
    end if;
    if (now() at time zone 'Asia/Bishkek') < (v_check_in::timestamp + time '13:00') then
      raise exception 'no_show_too_early' using errcode = '22023';
    end if;
    if v_reason is null then
      v_reason := 'Гость не заехал';
    end if;
    v_policy_code := 'non_refundable_no_show';
  end if;

  update public.booking_rooms
     set status = 'cancelled'
   where booking_id = p_booking_id
     and status = 'active';

  update public.bookings
     set status = p_new_status,
         cancelled_at = case when p_new_status = 'cancelled' then now() else cancelled_at end,
         cancellation_reason = case when p_new_status = 'cancelled' then v_reason else cancellation_reason end,
         termination_policy_code = v_policy_code,
         termination_days_before = v_days_before,
         termination_recorded_at = now(),
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
