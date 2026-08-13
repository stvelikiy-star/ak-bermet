-- =====================================================================
-- AK BERMET — Supabase SECURITY DEFINER execution hardening
-- =====================================================================
-- Root cause:
-- Supabase grants EXECUTE on newly created functions to anon/authenticated
-- through role-specific defaults. Earlier migrations revoked only PUBLIC,
-- which did not remove those explicit grants.
--
-- This migration:
--   1. removes anon access from every operational SECURITY DEFINER RPC;
--   2. keeps only intended authenticated staff RPCs directly executable;
--   3. keeps internal helpers/trigger functions service-role only;
--   4. pins search_path on functions flagged by Supabase Security Advisor;
--   5. moves relocatable btree_gist out of exposed public schema.
-- =====================================================================

begin;

-- Staff-facing RPCs: authenticated users only, plus trusted service role.
revoke all on function public.fn_mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.fn_mark_notification_read(uuid) to authenticated, service_role;

revoke all on function public.fn_assign_staff(public.assignment_task_type, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_assign_staff(public.assignment_task_type, uuid, uuid) to authenticated, service_role;

revoke all on function public.fn_accept_cleaning_task(uuid) from public, anon, authenticated;
grant execute on function public.fn_accept_cleaning_task(uuid) to authenticated, service_role;

revoke all on function public.fn_start_cleaning_task(uuid) from public, anon, authenticated;
grant execute on function public.fn_start_cleaning_task(uuid) to authenticated, service_role;

revoke all on function public.fn_complete_cleaning_task(uuid) from public, anon, authenticated;
grant execute on function public.fn_complete_cleaning_task(uuid) to authenticated, service_role;

revoke all on function public.fn_report_cleaning_problem(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.fn_report_cleaning_problem(uuid, text, boolean) to authenticated, service_role;

revoke all on function public.fn_accept_maintenance_request(uuid) from public, anon, authenticated;
grant execute on function public.fn_accept_maintenance_request(uuid) to authenticated, service_role;

revoke all on function public.fn_start_maintenance_request(uuid) from public, anon, authenticated;
grant execute on function public.fn_start_maintenance_request(uuid) to authenticated, service_role;

revoke all on function public.fn_record_maintenance_work_log(uuid, public.work_log_type, text, text, numeric, text, numeric) from public, anon, authenticated;
grant execute on function public.fn_record_maintenance_work_log(uuid, public.work_log_type, text, text, numeric, text, numeric) to authenticated, service_role;

revoke all on function public.fn_complete_maintenance_work(uuid) from public, anon, authenticated;
grant execute on function public.fn_complete_maintenance_work(uuid) to authenticated, service_role;

revoke all on function public.fn_close_maintenance_request(uuid, public.room_operational_status, text) from public, anon, authenticated;
grant execute on function public.fn_close_maintenance_request(uuid, public.room_operational_status, text) to authenticated, service_role;

revoke all on function public.fn_record_room_inspection(uuid, public.inspection_trigger_reason, public.inspection_result, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fn_record_room_inspection(uuid, public.inspection_trigger_reason, public.inspection_result, uuid, uuid, text) to authenticated, service_role;

revoke all on function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) to authenticated, service_role;

-- Internal helpers and trigger functions are not public RPC endpoints.
revoke all on function public.fn_transition_room_status(uuid, public.room_operational_status, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fn_transition_room_status(uuid, public.room_operational_status, uuid, uuid, uuid, text) to service_role;

revoke all on function public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid) to service_role;

revoke all on function public.fn_notify_user(uuid, public.operational_notification_type, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.fn_notify_user(uuid, public.operational_notification_type, text, text, text, uuid) to service_role;

revoke all on function public.fn_checkout_creates_cleaning_task() from public, anon, authenticated;
grant execute on function public.fn_checkout_creates_cleaning_task() to service_role;

revoke all on function public.fn_audit_row_change() from public, anon, authenticated;
grant execute on function public.fn_audit_row_change() to service_role;

revoke all on function public.fn_notify_inspection_failed() from public, anon, authenticated;
grant execute on function public.fn_notify_inspection_failed() to service_role;

revoke all on function public.sync_block_occupancy() from public, anon, authenticated;
grant execute on function public.sync_block_occupancy() to service_role;

revoke all on function public.sync_booking_room_occupancy() from public, anon, authenticated;
grant execute on function public.sync_booking_room_occupancy() to service_role;

revoke all on function public.sync_hold_occupancy() from public, anon, authenticated;
grant execute on function public.sync_hold_occupancy() to service_role;

-- Pin mutable search_path on invoker/trigger helpers flagged by Security Advisor.
alter function public.set_maintenance_request_number() set search_path = public, pg_temp;
alter function public.set_lead_number() set search_path = public, pg_temp;
alter function public.fn_expire_holds() set search_path = public, pg_temp;
alter function public.log_lead_status_change() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.log_cleaning_task_status_change() set search_path = public, pg_temp;
alter function public.log_booking_status_change() set search_path = public, pg_temp;
alter function public.set_booking_number() set search_path = public, pg_temp;
alter function public.has_role(public.role_name) set search_path = public, pg_temp;
alter function public.generate_public_number(text, text) set search_path = public, pg_temp;
alter function public.set_cleaning_task_number() set search_path = public, pg_temp;
alter function public.is_staff() set search_path = public, pg_temp;
alter function public.assigned_building_ids() set search_path = public, pg_temp;

-- Keep SECURITY DEFINER functions on a fixed search path as defense in depth.
alter function public.fn_mark_notification_read(uuid) set search_path = public, pg_temp;
alter function public.fn_assign_staff(public.assignment_task_type, uuid, uuid) set search_path = public, pg_temp;
alter function public.fn_accept_cleaning_task(uuid) set search_path = public, pg_temp;
alter function public.fn_start_cleaning_task(uuid) set search_path = public, pg_temp;
alter function public.fn_complete_cleaning_task(uuid) set search_path = public, pg_temp;
alter function public.fn_report_cleaning_problem(uuid, text, boolean) set search_path = public, pg_temp;
alter function public.fn_accept_maintenance_request(uuid) set search_path = public, pg_temp;
alter function public.fn_start_maintenance_request(uuid) set search_path = public, pg_temp;
alter function public.fn_record_maintenance_work_log(uuid, public.work_log_type, text, text, numeric, text, numeric) set search_path = public, pg_temp;
alter function public.fn_complete_maintenance_work(uuid) set search_path = public, pg_temp;
alter function public.fn_close_maintenance_request(uuid, public.room_operational_status, text) set search_path = public, pg_temp;
alter function public.fn_record_room_inspection(uuid, public.inspection_trigger_reason, public.inspection_result, uuid, uuid, text) set search_path = public, pg_temp;
alter function public.fn_mark_inspection_blocking_problem(uuid, text, uuid, uuid) set search_path = public, pg_temp;
alter function public.fn_transition_room_status(uuid, public.room_operational_status, uuid, uuid, uuid, text) set search_path = public, pg_temp;
alter function public.fn_notify_role(public.role_name, public.operational_notification_type, text, text, text, uuid) set search_path = public, pg_temp;
alter function public.fn_notify_user(uuid, public.operational_notification_type, text, text, text, uuid) set search_path = public, pg_temp;
alter function public.fn_checkout_creates_cleaning_task() set search_path = public, pg_temp;
alter function public.fn_audit_row_change() set search_path = public, pg_temp;
alter function public.fn_notify_inspection_failed() set search_path = public, pg_temp;
alter function public.sync_block_occupancy() set search_path = public, pg_temp;
alter function public.sync_booking_room_occupancy() set search_path = public, pg_temp;
alter function public.sync_hold_occupancy() set search_path = public, pg_temp;

-- btree_gist is relocatable; keep extension objects out of exposed public.
alter extension btree_gist set schema extensions;

commit;
