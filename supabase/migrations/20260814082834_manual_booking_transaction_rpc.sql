-- AK BERMET — atomic manual booking entry for manager CRM.
-- DEV ledger version: 20260814082834.
-- Production is not modified by this migration file alone.

create or replace function public.fn_create_manual_booking(
  p_room_unit_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_extra_beds integer,
  p_source public.lead_source,
  p_total_amount_kgs numeric,
  p_notes text
)
returns table (
  booking_id uuid,
  booking_number text,
  customer_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_room record;
begin
  if v_user_id is null or not (
    public.has_role('owner')
    or public.has_role('administrator')
    or public.has_role('manager')
  ) then
    raise exception 'manual_booking_not_authorized' using errcode = '42501';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'full_name_required' using errcode = '22023';
  end if;
  if nullif(btrim(p_phone), '') is null then
    raise exception 'phone_required' using errcode = '22023';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_booking_dates' using errcode = '22023';
  end if;
  if coalesce(p_adults, 0) < 1 or coalesce(p_children, 0) < 0 or coalesce(p_extra_beds, 0) < 0 then
    raise exception 'invalid_guest_counts' using errcode = '22023';
  end if;
  if coalesce(p_total_amount_kgs, 0) < 0 then
    raise exception 'invalid_total_amount' using errcode = '22023';
  end if;

  select id, max_capacity, extra_places, sellable_status, operational_status
    into v_room
  from public.room_units
  where id = p_room_unit_id
    and deleted_at is null;

  if not found then
    raise exception 'room_not_found' using errcode = '22023';
  end if;
  if v_room.sellable_status <> 'active' then
    raise exception 'room_not_sellable' using errcode = '22023';
  end if;
  if v_room.operational_status in ('maintenance_required', 'maintenance_in_progress', 'blocked') then
    raise exception 'room_operationally_blocked' using errcode = '22023';
  end if;
  if p_adults + p_children > v_room.max_capacity then
    raise exception 'room_capacity_exceeded' using errcode = '22023';
  end if;
  if p_extra_beds > v_room.extra_places then
    raise exception 'extra_bed_capacity_exceeded' using errcode = '22023';
  end if;

  insert into public.customers (full_name, phone, email, preferred_contact)
  values (
    btrim(p_full_name),
    btrim(p_phone),
    nullif(btrim(coalesce(p_email, '')), ''),
    'whatsapp'
  )
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        updated_at = now()
    where public.customers.deleted_at is null
  returning id into v_customer_id;

  if v_customer_id is null then
    raise exception 'customer_phone_belongs_to_deleted_record' using errcode = '23505';
  end if;

  insert into public.bookings (
    booking_number,
    customer_id,
    status,
    check_in,
    check_out,
    adults,
    children,
    source,
    total_amount_kgs,
    prepayment_required_kgs,
    notes,
    created_by
  )
  values (
    null,
    v_customer_id,
    'pending_confirmation',
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    coalesce(p_source, 'manual'),
    coalesce(p_total_amount_kgs, 0),
    round(coalesce(p_total_amount_kgs, 0) * 0.20, 2),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning id, bookings.booking_number into v_booking_id, v_booking_number;

  insert into public.booking_rooms (
    booking_id,
    room_unit_id,
    check_in,
    check_out,
    adults,
    children,
    extra_beds,
    status
  )
  values (
    v_booking_id,
    p_room_unit_id,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    p_extra_beds,
    'active'
  );

  return query select v_booking_id, v_booking_number, v_customer_id;
end;
$$;

revoke all on function public.fn_create_manual_booking(uuid,text,text,text,date,date,integer,integer,integer,public.lead_source,numeric,text) from public, anon;
grant execute on function public.fn_create_manual_booking(uuid,text,text,text,date,date,integer,integer,integer,public.lead_source,numeric,text) to authenticated;
