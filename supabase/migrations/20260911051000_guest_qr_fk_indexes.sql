-- AK BERMET — covering indexes for guest QR foreign keys.
begin;

create index if not exists idx_guest_room_tokens_created_by
  on public.guest_room_access_tokens(created_by)
  where created_by is not null;

create index if not exists idx_guest_requests_token
  on public.guest_service_requests(guest_room_access_token_id);

commit;
