-- Bind guest QR access to a concrete booking while keeping the schema
-- backward-compatible during the rolling production deploy.

alter table public.guest_room_access_tokens
  add column if not exists booking_id uuid;

alter table public.guest_service_requests
  add column if not exists booking_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_room_access_tokens_booking_id_fkey'
      and conrelid = 'public.guest_room_access_tokens'::regclass
  ) then
    alter table public.guest_room_access_tokens
      add constraint guest_room_access_tokens_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_service_requests_booking_id_fkey'
      and conrelid = 'public.guest_service_requests'::regclass
  ) then
    alter table public.guest_service_requests
      add constraint guest_service_requests_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete cascade;
  end if;
end
$$;

create index if not exists guest_room_access_tokens_booking_id_idx
  on public.guest_room_access_tokens(booking_id);

create unique index if not exists guest_room_access_tokens_one_active_per_booking_idx
  on public.guest_room_access_tokens(booking_id)
  where booking_id is not null and revoked_at is null;

create index if not exists guest_service_requests_booking_id_idx
  on public.guest_service_requests(booking_id);

create or replace function public.fn_validate_guest_token_booking_room()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.booking_id is not null
     and not exists (
       select 1
       from public.booking_rooms br
       where br.booking_id = new.booking_id
         and br.room_unit_id = new.room_unit_id
     ) then
    raise exception 'BOOKING_ROOM_MISMATCH';
  end if;

  return new;
end;
$$;

revoke all on function public.fn_validate_guest_token_booking_room()
  from public, anon, authenticated;

drop trigger if exists trg_guest_token_booking_room_guard
  on public.guest_room_access_tokens;

create trigger trg_guest_token_booking_room_guard
before insert or update of booking_id, room_unit_id
on public.guest_room_access_tokens
for each row
execute function public.fn_validate_guest_token_booking_room();

create or replace function public.fn_revoke_guest_tokens_on_booking_terminal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status
     and new.status in (
       'checked_out'::public.booking_status,
       'cancelled'::public.booking_status,
       'no_show'::public.booking_status
     ) then
    update public.guest_room_access_tokens
       set revoked_at = coalesce(revoked_at, now())
     where booking_id = new.id
       and revoked_at is null;
  end if;

  return new;
end;
$$;

revoke all on function public.fn_revoke_guest_tokens_on_booking_terminal()
  from public, anon, authenticated;

drop trigger if exists trg_revoke_guest_tokens_on_booking_terminal
  on public.bookings;

create trigger trg_revoke_guest_tokens_on_booking_terminal
after update of status
on public.bookings
for each row
execute function public.fn_revoke_guest_tokens_on_booking_terminal();
