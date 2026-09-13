-- AK BERMET web-runtime hardening.
-- Normal website/CRM requests must work with the publishable key + RLS/RPC.
-- The service role remains reserved for controlled background/maintenance jobs.

create or replace function public.fn_public_availability(
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_category text
)
returns table(
  category text,
  building text,
  capacity integer,
  view text,
  has_wifi boolean,
  repair_level text,
  preliminary boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rc.name::text,
    b.name::text,
    ru.max_capacity,
    case
      when ru.view_side = 'preferred_nature' then 'forest'
      when ru.view_side = 'service_yard' then 'yard'
      else 'other'
    end::text,
    ru.has_wifi,
    null::text,
    true
  from public.room_units ru
  join public.buildings b on b.id = ru.building_id and b.deleted_at is null
  join public.room_categories rc on rc.id = ru.room_category_id and rc.deleted_at is null
  where ru.deleted_at is null
    and ru.sellable_status = 'active'
    and ru.operational_status = 'ready'
    and ru.max_capacity >= greatest(coalesce(p_guests, 1), 1)
    and (nullif(btrim(p_category), '') is null or lower(rc.name) like '%' || lower(btrim(p_category)) || '%')
    and (
      (p_check_in is null and p_check_out is null)
      or (
        p_check_in is not null
        and p_check_out is not null
        and p_check_out > p_check_in
        and not exists (
          select 1
          from public.occupancy_periods op
          left join public.availability_holds ah on ah.id = op.availability_hold_id
          where op.room_unit_id = ru.id
            and op.status = 'active'
            and op.period && daterange(p_check_in, p_check_out, '[)')
            and (
              op.period_type <> 'hold'
              or (ah.status = 'active' and ah.expires_at > now())
            )
        )
      )
    )
  order by b.name, rc.name, ru.room_number;
$$;

revoke all on function public.fn_public_availability(date, date, integer, text) from public, anon, authenticated;
grant execute on function public.fn_public_availability(date, date, integer, text) to anon, authenticated, service_role;

create or replace function public.fn_public_create_lead(
  p_source public.lead_source,
  p_interest public.lead_interest,
  p_name text,
  p_phone text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_children_ages text,
  p_room_category_name text,
  p_wants_double_bed boolean,
  p_needs_extra_bed boolean,
  p_needs_wifi boolean,
  p_needs_lower_floor boolean,
  p_event_type text,
  p_guests_count integer,
  p_hall_size text,
  p_spa_service text,
  p_message text,
  p_preferred_contact public.preferred_contact
)
returns table(lead_id uuid, lead_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_category_count integer := 0;
  v_message text := nullif(btrim(p_message), '');
begin
  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then
    raise exception using errcode = '22023', message = 'INVALID_NAME';
  end if;
  if length(coalesce(p_phone, '')) > 40 or length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 9 and 20 then
    raise exception using errcode = '22023', message = 'INVALID_PHONE';
  end if;
  if p_check_in is not null and p_check_out is not null and p_check_out <= p_check_in then
    raise exception using errcode = '22023', message = 'INVALID_DATE_RANGE';
  end if;
  if p_adults is not null and (p_adults < 1 or p_adults > 1000) then
    raise exception using errcode = '22023', message = 'INVALID_ADULTS';
  end if;
  if p_children is not null and (p_children < 0 or p_children > 1000) then
    raise exception using errcode = '22023', message = 'INVALID_CHILDREN';
  end if;
  if p_guests_count is not null and (p_guests_count < 1 or p_guests_count > 10000) then
    raise exception using errcode = '22023', message = 'INVALID_GUESTS';
  end if;
  if length(coalesce(p_children_ages, '')) > 200
     or length(coalesce(p_room_category_name, '')) > 200
     or length(coalesce(p_event_type, '')) > 200
     or length(coalesce(p_hall_size, '')) > 200
     or length(coalesce(p_spa_service, '')) > 200
     or length(coalesce(p_message, '')) > 4000 then
    raise exception using errcode = '22023', message = 'INPUT_TOO_LONG';
  end if;

  if nullif(btrim(p_room_category_name), '') is not null then
    select count(*), min(rc.id)
      into v_category_count, v_category_id
    from public.room_categories rc
    where rc.deleted_at is null
      and lower(rc.name) = lower(btrim(p_room_category_name));

    if v_category_count <> 1 then
      v_category_id := null;
      v_message := concat_ws(E'\n', 'Категория номера: ' || btrim(p_room_category_name), v_message);
    end if;
  end if;

  return query
  insert into public.leads(
    source, interest, status, name, phone,
    check_in, check_out, adults, children, children_ages,
    room_category_id, wants_double_bed, needs_extra_bed, needs_wifi, needs_lower_floor,
    event_type, guests_count, hall_size, spa_service, message, preferred_contact
  ) values (
    p_source, p_interest, 'new', btrim(p_name), btrim(p_phone),
    p_check_in, p_check_out, p_adults, p_children, nullif(btrim(p_children_ages), ''),
    v_category_id, p_wants_double_bed, p_needs_extra_bed, p_needs_wifi, p_needs_lower_floor,
    nullif(btrim(p_event_type), ''), p_guests_count, nullif(btrim(p_hall_size), ''),
    nullif(btrim(p_spa_service), ''), v_message, p_preferred_contact
  )
  returning leads.id, leads.lead_number;
end;
$$;

revoke all on function public.fn_public_create_lead(public.lead_source, public.lead_interest, text, text, date, date, integer, integer, text, text, boolean, boolean, boolean, boolean, text, integer, text, text, text, public.preferred_contact) from public, anon, authenticated;
grant execute on function public.fn_public_create_lead(public.lead_source, public.lead_interest, text, text, date, date, integer, integer, text, text, boolean, boolean, boolean, boolean, text, integer, text, text, text, public.preferred_contact) to anon, authenticated, service_role;

create or replace function public.fn_public_guest_room_context(p_token_hash text)
returns table(
  token_id uuid,
  booking_id uuid,
  booking_number text,
  guest_name text,
  room_unit_id uuid,
  room_number text,
  building_name text,
  category_name text,
  expires_at timestamptz,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    b.id,
    b.booking_number,
    c.full_name,
    ru.id,
    ru.room_number,
    coalesce(bl.name, 'AK BERMET'),
    coalesce(rc.name, 'Номер'),
    t.expires_at,
    t.label
  from public.guest_room_access_tokens t
  join public.bookings b on b.id = t.booking_id and b.deleted_at is null
  join public.customers c on c.id = b.customer_id and c.deleted_at is null
  join public.room_units ru on ru.id = t.room_unit_id and ru.deleted_at is null
  left join public.buildings bl on bl.id = ru.building_id
  left join public.room_categories rc on rc.id = ru.room_category_id
  where p_token_hash ~ '^[0-9a-f]{64}$'
    and t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and b.status in ('confirmed', 'checked_in')
    and exists (
      select 1 from public.booking_rooms br
      where br.booking_id = b.id and br.room_unit_id = ru.id
    )
  limit 1;
$$;

revoke all on function public.fn_public_guest_room_context(text) from public, anon, authenticated;
grant execute on function public.fn_public_guest_room_context(text) to anon, authenticated, service_role;

create or replace function public.fn_public_create_guest_request(
  p_token_hash text,
  p_request_type text,
  p_message text
)
returns table(
  request_id uuid,
  booking_id uuid,
  request_type text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_id uuid;
  v_booking_id uuid;
  v_room_unit_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_TOKEN';
  end if;
  if p_request_type is null or p_request_type <> all(array['housekeeping','towels','water','maintenance','restaurant','other']) then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST_TYPE';
  end if;
  if length(coalesce(p_message, '')) > 2000 then
    raise exception using errcode = '22023', message = 'MESSAGE_TOO_LONG';
  end if;

  select t.id, t.booking_id, t.room_unit_id
    into v_token_id, v_booking_id, v_room_unit_id
  from public.guest_room_access_tokens t
  join public.bookings b on b.id = t.booking_id and b.deleted_at is null
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and b.status in ('confirmed', 'checked_in')
    and exists (
      select 1 from public.booking_rooms br
      where br.booking_id = b.id and br.room_unit_id = t.room_unit_id
    )
  limit 1;

  if v_token_id is null then
    raise exception using errcode = '42501', message = 'INVALID_OR_EXPIRED_QR';
  end if;

  return query
  insert into public.guest_service_requests(
    guest_room_access_token_id, booking_id, room_unit_id, request_type, message
  ) values (
    v_token_id, v_booking_id, v_room_unit_id, p_request_type, nullif(btrim(p_message), '')
  )
  returning guest_service_requests.id,
            guest_service_requests.booking_id,
            guest_service_requests.request_type,
            guest_service_requests.status,
            guest_service_requests.created_at;
end;
$$;

revoke all on function public.fn_public_create_guest_request(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_public_create_guest_request(text, text, text) to anon, authenticated, service_role;

create or replace function public.fn_manager_rotate_guest_room_access_token(
  p_booking_id uuid,
  p_room_unit_id uuid,
  p_token_hash text,
  p_label text
)
returns table(
  token_id uuid,
  booking_id uuid,
  room_unit_id uuid,
  label text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_check_out date;
  v_expires_at timestamptz;
begin
  if v_user_id is null or not (
    public.has_role('owner'::public.role_name)
    or public.has_role('administrator'::public.role_name)
    or public.has_role('manager'::public.role_name)
  ) then
    raise exception using errcode = '42501', message = 'ACCESS_DENIED';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_TOKEN_HASH';
  end if;
  if length(btrim(coalesce(p_label, ''))) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_LABEL';
  end if;

  select b.check_out into v_check_out
  from public.bookings b
  where b.id = p_booking_id
    and b.deleted_at is null
    and b.status in ('confirmed', 'checked_in');

  if v_check_out is null then
    raise exception using errcode = '22023', message = 'BOOKING_NOT_GUEST_ACTIVE';
  end if;
  if not exists (
    select 1 from public.booking_rooms br
    where br.booking_id = p_booking_id and br.room_unit_id = p_room_unit_id
  ) then
    raise exception using errcode = '22023', message = 'BOOKING_ROOM_MISMATCH';
  end if;

  v_expires_at := (v_check_out + time '13:00') at time zone 'Asia/Bishkek';
  if v_expires_at <= now() then
    raise exception using errcode = '22023', message = 'BOOKING_EXPIRED';
  end if;

  update public.guest_room_access_tokens t
     set revoked_at = now()
   where t.booking_id = p_booking_id
     and t.room_unit_id = p_room_unit_id
     and t.revoked_at is null;

  return query
  insert into public.guest_room_access_tokens(
    booking_id, room_unit_id, token_hash, label, expires_at, created_by
  ) values (
    p_booking_id, p_room_unit_id, p_token_hash, btrim(p_label), v_expires_at, v_user_id
  )
  returning guest_room_access_tokens.id,
            guest_room_access_tokens.booking_id,
            guest_room_access_tokens.room_unit_id,
            guest_room_access_tokens.label,
            guest_room_access_tokens.expires_at,
            guest_room_access_tokens.created_at;
end;
$$;

revoke all on function public.fn_manager_rotate_guest_room_access_token(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.fn_manager_rotate_guest_room_access_token(uuid, uuid, text, text) to authenticated, service_role;

create or replace function public.fn_manager_revoke_guest_room_access_token(p_token_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    public.has_role('owner'::public.role_name)
    or public.has_role('administrator'::public.role_name)
    or public.has_role('manager'::public.role_name)
  ) then
    raise exception using errcode = '42501', message = 'ACCESS_DENIED';
  end if;

  update public.guest_room_access_tokens
     set revoked_at = now()
   where id = p_token_id and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.fn_manager_revoke_guest_room_access_token(uuid) from public, anon, authenticated;
grant execute on function public.fn_manager_revoke_guest_room_access_token(uuid) to authenticated, service_role;

create or replace function public.fn_manager_update_lead(
  p_lead_id uuid,
  p_status public.lead_status,
  p_manager_comment text,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_at timestamptz;
begin
  if v_user_id is null or not (
    public.has_role('owner'::public.role_name)
    or public.has_role('administrator'::public.role_name)
    or public.has_role('manager'::public.role_name)
  ) then
    raise exception using errcode = '42501', message = 'ACCESS_DENIED';
  end if;
  if length(coalesce(p_manager_comment, '')) > 4000 then
    raise exception using errcode = '22023', message = 'COMMENT_TOO_LONG';
  end if;

  update public.leads l
     set status = p_status,
         manager_comment = nullif(btrim(p_manager_comment), ''),
         assigned_manager_id = v_user_id
   where l.id = p_lead_id
     and l.deleted_at is null
     and l.updated_at = p_expected_updated_at
  returning l.updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

revoke all on function public.fn_manager_update_lead(uuid, public.lead_status, text, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_manager_update_lead(uuid, public.lead_status, text, timestamptz) to authenticated, service_role;
