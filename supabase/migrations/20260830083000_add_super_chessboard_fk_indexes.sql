-- AK BERMET — targeted performance hardening for SUPER Chessboard tables.
--
-- Supabase performance advisor reported four foreign keys without covering
-- indexes. These indexes do not change booking semantics, RLS, RPC grants,
-- room availability, or production cutover state.

create index if not exists booking_room_change_history_booking_room_id_idx
  on public.booking_room_change_history (booking_room_id);

create index if not exists booking_room_change_history_old_room_unit_id_idx
  on public.booking_room_change_history (old_room_unit_id);

create index if not exists booking_room_change_history_new_room_unit_id_idx
  on public.booking_room_change_history (new_room_unit_id);

create index if not exists booking_services_service_id_idx
  on public.booking_services (service_id);
