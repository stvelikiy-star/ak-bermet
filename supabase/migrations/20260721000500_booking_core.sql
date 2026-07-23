-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0005: Booking Core
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0004.
--
-- Phase 1 booking-core scope: bookings, booking_rooms, booking_status_
-- history. Overlap-prevention (availability_holds, occupancy_periods,
-- the EXCLUDE constraint) is in 0006_booking_integrity.sql.
--
-- OUT OF PHASE 1 SCOPE (later package, per architecture report Section
-- 15 wave 4): booking_guests, booking_price_components, booking_services,
-- cancellation_records, and all of Payments. These depend on pricing/
-- FreedomPay work not yet started, per the architecture report.
-- =====================================================================

begin;

-- bookings: the confirmed/pending reservation header. A booking can span
-- multiple rooms (family across 2 units, event block).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.booking_status not null default 'pending_confirmation',
  check_in date not null,
  check_out date not null,
  adults integer not null default 1,
  children integer not null default 0,
  source public.lead_source not null,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  total_amount_kgs numeric(12,2) not null default 0,
  prepayment_required_kgs numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (check_out > check_in),
  check (total_amount_kgs >= 0),
  check (prepayment_required_kgs >= 0)
);
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create index idx_bookings_status on public.bookings(status) where deleted_at is null;
create index idx_bookings_customer on public.bookings(customer_id);
create index idx_bookings_dates on public.bookings(check_in, check_out);
comment on table public.bookings is
  'check (check_out > check_in) is the first line of defense against '
  'invalid date ranges. The stronger guarantee (no double-booking of a '
  'physical room) is enforced at the booking_rooms/occupancy_periods '
  'level in 0006, not here, because a single booking header can validly '
  'span multiple rooms with independently-checkable sub-ranges.';

create or replace function public.set_booking_number()
returns trigger language plpgsql as $$
begin
  new.booking_number := public.generate_public_number('BRM', 'booking_number_seq');
  return new;
end;
$$;
create trigger trg_bookings_public_number before insert on public.bookings
  for each row when (new.booking_number is null)
  execute procedure public.set_booking_number();

-- Resolves the forward reference declared in 0004.
alter table public.leads
  add constraint fk_leads_booking foreign key (booking_id) references public.bookings(id) on delete set null;

-- booking_rooms: which physical room unit(s) fulfill the booking, and for
-- what date sub-range (supports mid-stay room changes).
create table public.booking_rooms (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  adults integer not null default 1,
  children integer not null default 0,
  extra_beds integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (status in ('active', 'cancelled', 'moved'))
);
create trigger trg_booking_rooms_updated_at before update on public.booking_rooms
  for each row execute function public.set_updated_at();
create index idx_booking_rooms_booking on public.booking_rooms(booking_id);
create index idx_booking_rooms_room on public.booking_rooms(room_unit_id);

-- booking_status_history: append-only, mirrors lead_status_history
-- pattern.
create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status public.booking_status not null,
  changed_by uuid references public.profiles(id),
  comment text,
  created_at timestamptz not null default now()
);
create index idx_booking_status_history_booking on public.booking_status_history(booking_id, created_at);

create or replace function public.log_booking_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.booking_status_history (booking_id, status, changed_by)
    values (new.id, new.status, new.confirmed_by);
  end if;
  return new;
end;
$$;
create trigger trg_bookings_status_history
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_status_change();

commit;
