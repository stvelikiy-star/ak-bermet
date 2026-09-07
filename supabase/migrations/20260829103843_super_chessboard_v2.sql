-- SUPER CHESSBOARD V2
-- Safe booking placement changes + universal booking services.

create table if not exists public.booking_room_change_history (
  id uuid primary key default gen_random_uuid(),
  booking_room_id uuid not null references public.booking_rooms(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  old_room_unit_id uuid not null references public.room_units(id) on delete restrict,
  new_room_unit_id uuid not null references public.room_units(id) on delete restrict,
  old_check_in date not null,
  old_check_out date not null,
  new_check_in date not null,
  new_check_out date not null,
  reason text,
  changed_by uuid,
  created_at timestamptz not null default now(),
  constraint booking_room_change_history_old_dates check (old_check_out > old_check_in),
  constraint booking_room_change_history_new_dates check (new_check_out > new_check_in)
);

create index if not exists booking_room_change_history_booking_idx
  on public.booking_room_change_history (booking_id, created_at desc);

alter table public.booking_room_change_history enable row level security;
revoke all on public.booking_room_change_history from anon;
revoke insert, update, delete on public.booking_room_change_history from authenticated;
grant select on public.booking_room_change_history to authenticated;

drop policy if exists booking_room_change_history_manager_read on public.booking_room_change_history;
create policy booking_room_change_history_manager_read
on public.booking_room_change_history
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'other',
  pricing_mode text not null default 'manual',
  price_kgs numeric(12,2),
  unit_label text not null default 'услуга',
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_catalog_code_nonempty check (btrim(code) <> ''),
  constraint service_catalog_name_nonempty check (btrim(name) <> ''),
  constraint service_catalog_pricing_mode check (pricing_mode in ('fixed','manual')),
  constraint service_catalog_price_nonnegative check (price_kgs is null or price_kgs >= 0),
  constraint service_catalog_fixed_price_required check (pricing_mode <> 'fixed' or price_kgs is not null)
);

create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  service_id uuid not null references public.service_catalog(id) on delete restrict,
  service_name_snapshot text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_kgs numeric(12,2) not null default 0,
  total_amount_kgs numeric(14,2) generated always as (round(quantity * unit_price_kgs, 2)) stored,
  scheduled_for date,
  status text not null default 'planned',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_services_quantity_positive check (quantity > 0),
  constraint booking_services_unit_price_nonnegative check (unit_price_kgs >= 0),
  constraint booking_services_status check (status in ('planned','confirmed','completed','cancelled'))
);

create index if not exists booking_services_booking_idx
  on public.booking_services (booking_id, created_at);

alter table public.service_catalog enable row level security;
alter table public.booking_services enable row level security;

revoke all on public.service_catalog from anon;
revoke all on public.booking_services from anon;
grant select on public.service_catalog to authenticated;
grant select on public.booking_services to authenticated;
revoke insert, update, delete on public.service_catalog from authenticated;
revoke insert, update, delete on public.booking_services from authenticated;

drop policy if exists service_catalog_manager_read on public.service_catalog;
create policy service_catalog_manager_read
on public.service_catalog
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

drop policy if exists booking_services_manager_read on public.booking_services;
create policy booking_services_manager_read
on public.booking_services
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

insert into public.service_catalog (code, name, category, pricing_mode, price_kgs, unit_label, sort_order)
values
  ('TRANSFER', 'Трансфер', 'transport', 'manual', null, 'поездка', 10),
  ('SPA', 'SPA', 'wellness', 'manual', null, 'услуга', 20),
  ('POOL', 'Бассейн', 'wellness', 'manual', null, 'посещение', 30),
  ('HOT_SPRINGS', 'Горячие источники', 'wellness', 'manual', null, 'посещение', 40),
  ('CHILD_MEAL', 'Детское 3-разовое питание', 'food', 'fixed', 1440, 'сутки / ребёнок', 50),
  ('CHILD_EXTRA_BED', 'Детское дополнительное место', 'accommodation', 'fixed', 1500, 'сутки / ребёнок', 60),
  ('ADULT_MEAL', 'Взрослое дополнительное питание', 'food', 'fixed', 1800, 'сутки / взрослый', 70),
  ('ADULT_EXTRA_BED', 'Взрослое дополнительное место', 'accommodation', 'fixed', 1800, 'сутки / взрослый', 80),
  ('PARKING_SUMMER', 'Парковка — лето', 'parking', 'fixed', 150, 'сутки', 90),
  ('PARKING_OTHER', 'Парковка — другие сезоны', 'parking', 'fixed', 100, 'сутки', 100),
  ('OTHER', 'Другая услуга', 'other', 'manual', null, 'услуга', 999)
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    pricing_mode = excluded.pricing_mode,
    price_kgs = excluded.price_kgs,
    unit_label = excluded.unit_label,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

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
  select br.* into v_booking_room from public.booking_rooms br where br.id = p_booking_room_id for update;
  if not found or v_booking_room.status <> 'active' then raise exception 'booking_room_not_found' using errcode = '22023'; end if;
  select b.* into v_booking from public.bookings b where b.id = v_booking_room.booking_id and b.deleted_at is null for update;
  if not found then raise exception 'booking_not_found' using errcode = '22023'; end if;
  if v_booking.status not in ('pending_confirmation', 'confirmed') then raise exception 'booking_move_status_not_allowed' using errcode = '22023'; end if;
  select ru.* into v_target from public.room_units ru where ru.id = p_target_room_unit_id and ru.deleted_at is null for update;
  if not found then raise exception 'room_not_found' using errcode = '22023'; end if;
  if v_target.sellable_status <> 'active' then raise exception 'room_not_sellable' using errcode = '22023'; end if;
  if v_target.operational_status in ('maintenance_required', 'maintenance_in_progress', 'blocked') then raise exception 'room_operationally_blocked' using errcode = '22023'; end if;
  if v_booking_room.adults + v_booking_room.children > v_target.max_capacity then raise exception 'room_capacity_exceeded' using errcode = '22023'; end if;
  if v_booking_room.extra_beds > v_target.extra_places then raise exception 'extra_bed_capacity_exceeded' using errcode = '22023'; end if;
  if v_booking_room.room_unit_id = p_target_room_unit_id and v_booking_room.check_in = p_check_in and v_booking_room.check_out = p_check_out then
    return query select v_booking.id, v_booking_room.id, v_booking_room.room_unit_id, v_booking_room.check_in, v_booking_room.check_out;
    return;
  end if;
  update public.booking_rooms set room_unit_id = p_target_room_unit_id, check_in = p_check_in, check_out = p_check_out where id = v_booking_room.id;
  select count(*) into v_active_room_count from public.booking_rooms where booking_id = v_booking.id and status = 'active';
  if v_active_room_count = 1 then update public.bookings set check_in = p_check_in, check_out = p_check_out where id = v_booking.id; end if;
  insert into public.booking_room_change_history (booking_room_id, booking_id, old_room_unit_id, new_room_unit_id, old_check_in, old_check_out, new_check_in, new_check_out, reason, changed_by)
  values (v_booking_room.id, v_booking.id, v_booking_room.room_unit_id, p_target_room_unit_id, v_booking_room.check_in, v_booking_room.check_out, p_check_in, p_check_out, nullif(btrim(coalesce(p_reason, '')), ''), v_user_id);
  return query select v_booking.id, v_booking_room.id, p_target_room_unit_id, p_check_in, p_check_out;
end;
$$;

revoke all on function public.fn_move_booking_room(uuid, uuid, date, date, text) from public;
revoke execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) from anon;
grant execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) to authenticated;
grant execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) to service_role;

create or replace function public.fn_add_booking_service(
  p_booking_id uuid,
  p_service_code text,
  p_quantity numeric default 1,
  p_unit_price_kgs numeric default null,
  p_scheduled_for date default null,
  p_notes text default null
)
returns table (booking_service_id uuid, booking_id uuid, service_code text, total_amount_kgs numeric)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_service public.service_catalog%rowtype;
  v_unit_price numeric(12,2);
  v_id uuid;
begin
  if v_user_id is null or not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then raise exception 'booking_service_not_authorized' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid_service_quantity' using errcode = '22023'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and deleted_at is null for update;
  if not found then raise exception 'booking_not_found' using errcode = '22023'; end if;
  select * into v_service from public.service_catalog where code = upper(btrim(coalesce(p_service_code, ''))) and is_active = true;
  if not found then raise exception 'service_not_found' using errcode = '22023'; end if;
  if v_service.pricing_mode = 'fixed' then
    v_unit_price := v_service.price_kgs;
  else
    if p_unit_price_kgs is null or p_unit_price_kgs < 0 then raise exception 'manual_service_price_required' using errcode = '22023'; end if;
    v_unit_price := p_unit_price_kgs;
  end if;
  insert into public.booking_services (booking_id, service_id, service_name_snapshot, quantity, unit_price_kgs, scheduled_for, notes, created_by)
  values (v_booking.id, v_service.id, v_service.name, p_quantity, v_unit_price, p_scheduled_for, nullif(btrim(coalesce(p_notes, '')), ''), v_user_id) returning id into v_id;
  return query select v_id, v_booking.id, v_service.code, round(p_quantity * v_unit_price, 2);
end;
$$;

revoke all on function public.fn_add_booking_service(uuid, text, numeric, numeric, date, text) from public;
revoke execute on function public.fn_add_booking_service(uuid, text, numeric, numeric, date, text) from anon;
grant execute on function public.fn_add_booking_service(uuid, text, numeric, numeric, date, text) to authenticated;
grant execute on function public.fn_add_booking_service(uuid, text, numeric, numeric, date, text) to service_role;

create or replace function public.fn_set_booking_service_status(p_booking_service_id uuid, p_status text)
returns text language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')) then raise exception 'booking_service_not_authorized' using errcode = '42501'; end if;
  if p_status not in ('planned','confirmed','completed','cancelled') then raise exception 'invalid_service_status' using errcode = '22023'; end if;
  update public.booking_services set status = p_status, updated_at = now() where id = p_booking_service_id;
  if not found then raise exception 'booking_service_not_found' using errcode = '22023'; end if;
  return p_status;
end;
$$;

revoke all on function public.fn_set_booking_service_status(uuid, text) from public;
revoke execute on function public.fn_set_booking_service_status(uuid, text) from anon;
grant execute on function public.fn_set_booking_service_status(uuid, text) to authenticated;
grant execute on function public.fn_set_booking_service_status(uuid, text) to service_role;
