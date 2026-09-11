-- AK BERMET — guest QR access and in-room service requests.
-- Raw QR secrets are never stored; only SHA-256 token hashes are persisted.

begin;

create table public.guest_room_access_tokens (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Guest QR',
  expires_at timestamptz not null default (now() + interval '365 days'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (length(token_hash) = 64),
  check (length(btrim(label)) between 1 and 120)
);

create index idx_guest_room_tokens_room on public.guest_room_access_tokens(room_unit_id) where revoked_at is null;
create index idx_guest_room_tokens_active on public.guest_room_access_tokens(token_hash) where revoked_at is null;

create table public.guest_service_requests (
  id uuid primary key default gen_random_uuid(),
  guest_room_access_token_id uuid not null references public.guest_room_access_tokens(id) on delete cascade,
  room_unit_id uuid not null references public.room_units(id) on delete restrict,
  request_type text not null check (request_type in ('housekeeping', 'towels', 'water', 'maintenance', 'restaurant', 'other')),
  message text,
  status text not null default 'new' check (status in ('new', 'acknowledged', 'in_progress', 'resolved', 'cancelled')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  check (message is null or length(message) <= 2000)
);

create index idx_guest_requests_status on public.guest_service_requests(status, created_at desc);
create index idx_guest_requests_room on public.guest_service_requests(room_unit_id, created_at desc);

alter table public.guest_room_access_tokens enable row level security;
alter table public.guest_service_requests enable row level security;

create policy guest_room_tokens_manager_select on public.guest_room_access_tokens for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy guest_room_tokens_admin_all on public.guest_room_access_tokens for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));
create policy guest_requests_manager_select on public.guest_service_requests for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy guest_requests_manager_update on public.guest_service_requests for update
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

revoke all on public.guest_room_access_tokens from anon, authenticated;
revoke all on public.guest_service_requests from anon, authenticated;
grant select on public.guest_room_access_tokens to authenticated;
grant select on public.guest_service_requests to authenticated;

commit;
