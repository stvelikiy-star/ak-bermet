-- A single booking may contain several rooms. Keep one active QR per
-- concrete booking + room pair, not one QR for the whole booking.

drop index if exists public.guest_room_access_tokens_one_active_per_booking_idx;

create unique index if not exists guest_room_access_tokens_one_active_per_booking_room_idx
  on public.guest_room_access_tokens(booking_id, room_unit_id)
  where booking_id is not null and revoked_at is null;
