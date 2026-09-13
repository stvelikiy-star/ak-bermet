-- Canonical public accommodation labels for website availability and guest portal.
-- Keep the approved V6 staging/raw category names untouched in room_categories.

create or replace function public.fn_public_room_category_label(
  p_building text,
  p_raw_category text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_building in ('Garden 1', 'Garden 2') then 'Garden Rooms'
    when p_building = 'Corpus 2' and p_raw_category in ('люкс (две)', 'люкс (одна)') then 'Люкс'
    when p_building = 'Corpus 2' and p_raw_category in ('две', 'одна') then 'Стандарт'
    when p_building = 'Corpus 3' and p_raw_category = 'люкс' then 'Люкс'
    when p_building = 'Corpus 3' and p_raw_category in ('п/люкс. 1 кровать', 'п/люкс. 2 кровати') then 'Полулюкс'
    when p_building = 'Corpus 3' and p_raw_category in ('станд. 1 кровать', 'станд. 2 кровати') then 'Стандарт'
    when p_building = 'Corpus 3' and p_raw_category in ('4-х семейный', '4-х семейный-3') then 'Семейный 4-местный'
    when p_building in ('Brick Cottage', 'Log House') then 'Коттеджи и срубы'
    when p_building = 'Corpus 1' and p_raw_category in ('две 2', 'одна 1', 'одна 2') then 'Корпус №1 — 2-местный'
    when p_building = 'Corpus 1' and p_raw_category = 'три 3' then 'Корпус №1 — 3-местный'
    when p_building = 'Corpus 1' and p_raw_category = '4-х мест' then 'Корпус №1 — 4-местный'
    else coalesce(nullif(btrim(p_raw_category), ''), 'Номер')
  end;
$$;

revoke all on function public.fn_public_room_category_label(text, text) from public, anon, authenticated;

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
    public.fn_public_room_category_label(b.name, rc.name),
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
    and (
      nullif(btrim(p_category), '') is null
      or lower(public.fn_public_room_category_label(b.name, rc.name)) =
        case lower(btrim(p_category))
          when 'garden' then 'garden rooms'
          when 'семейный' then 'семейный 4-местный'
          when 'семейные' then 'семейный 4-местный'
          when 'коттедж' then 'коттеджи и срубы'
          when 'коттеджи' then 'коттеджи и срубы'
          when 'сруб' then 'коттеджи и срубы'
          when 'срубы' then 'коттеджи и срубы'
          else lower(btrim(p_category))
        end
      or lower(rc.name) = lower(btrim(p_category))
    )
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
  order by b.name, public.fn_public_room_category_label(b.name, rc.name), ru.room_number;
$$;

revoke all on function public.fn_public_availability(date, date, integer, text) from public, anon, authenticated;
grant execute on function public.fn_public_availability(date, date, integer, text) to anon, authenticated;

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
    public.fn_public_room_category_label(bl.name, rc.name),
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
grant execute on function public.fn_public_guest_room_context(text) to anon, authenticated;
