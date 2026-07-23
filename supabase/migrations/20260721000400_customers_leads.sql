-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0004: CRM Foundation
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001, 0002, 0003.
--
-- Phase 1 CRM scope: customers, leads, lead_status_history only.
-- lead_contacts, messages, message_media, lead_tasks, error_logs are P2
-- items in the full architecture draft and are OUT of Phase 1 scope.
--
-- IMPORTANT: this file contains no INSERT statements and imports no real
-- customer/lead data. Populating these tables from the live "Заявки" /
-- "История заявок" Google Sheets is a separate, later data-migration
-- task per the architecture report's shadow-read/diff phase (Section 14)
-- — explicitly not part of this structural package.
-- =====================================================================

begin;

-- customers: the durable guest identity, deduplicated by phone.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  preferred_contact public.preferred_contact,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (phone)
);
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- leads: 1:1 with src/types/lead.ts Lead plus staff-assignment fields.
--
-- FORWARD REFERENCE NOTE: booking_id references public.bookings, which
-- does not exist until 0005 runs. The column is declared here without a
-- foreign key; 0005 adds the FK constraint immediately after creating
-- bookings.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  source public.lead_source not null,
  interest public.lead_interest not null,
  status public.lead_status not null default 'new',
  name text not null,
  phone text not null,
  check_in date,
  check_out date,
  adults integer,
  children integer,
  children_ages text,
  room_category_id uuid references public.room_categories(id),
  wants_double_bed boolean,
  needs_extra_bed boolean,
  needs_wifi boolean,
  needs_lower_floor boolean,
  event_type text,
  guests_count integer,
  hall_size text,
  spa_service text,
  message text,
  preferred_contact public.preferred_contact,
  assigned_manager_id uuid references public.profiles(id),
  manager_comment text,
  booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (check_out is null or check_in is null or check_out > check_in)
);
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create index idx_leads_status on public.leads(status) where deleted_at is null;
create index idx_leads_phone on public.leads(phone);
create index idx_leads_created_at on public.leads(created_at desc);

create or replace function public.set_lead_number()
returns trigger language plpgsql as $$
begin
  new.lead_number := public.generate_public_number('LEAD', 'lead_number_seq');
  return new;
end;
$$;
create trigger trg_leads_public_number before insert on public.leads
  for each row when (new.lead_number is null)
  execute procedure public.set_lead_number();

-- lead_status_history: append-only. Mirrors the current "История заявок"
-- sheet exactly. Populated by a trigger on leads.status change — never
-- written directly by application code, so it cannot drift from reality
-- the way a manual dual-write (status cell + separate history append)
-- can.
create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  status public.lead_status not null,
  changed_by uuid references public.profiles(id),
  comment text,
  created_at timestamptz not null default now()
);
create index idx_lead_status_history_lead on public.lead_status_history(lead_id, created_at);

create or replace function public.log_lead_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.lead_status_history (lead_id, status, changed_by, comment)
    values (new.id, new.status, new.assigned_manager_id, new.manager_comment);
  end if;
  return new;
end;
$$;
create trigger trg_leads_status_history
  after insert or update of status on public.leads
  for each row execute function public.log_lead_status_change();

commit;
