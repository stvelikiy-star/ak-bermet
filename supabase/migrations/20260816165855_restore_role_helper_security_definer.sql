-- =====================================================================
-- AK BERMET — Restore RLS role-helper execution context
-- DEV ledger version: 20260816165855
-- =====================================================================
--
-- DEV real-session UAT exposed a recursive RLS failure (PostgreSQL 54001):
-- public.user_roles policies call public.has_role(), while the live helper
-- functions had drifted to SECURITY INVOKER. An invoker helper reading
-- public.user_roles re-enters that table's RLS policy and recursively calls
-- public.has_role() again.
--
-- The original identity/roles contract intentionally defined has_role()
-- and is_staff() as SECURITY DEFINER helpers owned by the migration role,
-- with a fixed search_path, specifically to break that recursion safely.
--
-- This forward-only repair changes only the execution context of the two
-- existing helpers. It does not widen RLS, change grants, alter roles, or
-- modify business data.
-- =====================================================================

begin;

alter function public.has_role(public.role_name) security definer;
alter function public.has_role(public.role_name) set search_path = public, pg_temp;

alter function public.is_staff() security definer;
alter function public.is_staff() set search_path = public, pg_temp;

commit;
