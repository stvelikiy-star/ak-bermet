-- AK BERMET — restore append-only audit trigger execution contract.
--
-- Both helpers are trigger-only writers for RLS-protected history tables.
-- The history tables intentionally have no application INSERT policy, so
-- these trigger helpers must execute with definer rights. SECURITY INVOKER
-- makes ordinary authenticated lead/booking writes fail with RLS 42501.
--
-- This migration changes function execution mode only. It does not alter
-- RLS policies, table grants, application RPC authority, or business data.

begin;

alter function public.log_lead_status_change() security definer;
alter function public.log_lead_status_change() set search_path = public, pg_temp;

alter function public.log_booking_status_change() security definer;
alter function public.log_booking_status_change() set search_path = public, pg_temp;

commit;
