-- SUPER CHESSBOARD V2 follow-up hardening.
-- Supabase default privileges may grant EXECUTE directly to anon on new functions,
-- so revoke anon explicitly for already-applied environments.

revoke execute on function public.fn_move_booking_room(uuid, uuid, date, date, text) from anon;
revoke execute on function public.fn_add_booking_service(uuid, text, numeric, numeric, date, text) from anon;
revoke execute on function public.fn_set_booking_service_status(uuid, text) from anon;
