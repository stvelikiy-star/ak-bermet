-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0008: Row-Level Security Policies
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0007.
--
-- Every table created by 0001-0007 gets RLS enabled AND at least one
-- explicit, role-scoped policy in this file. No table is left with a
-- permissive "true" policy and no table is left enabled-but-policy-less
-- (which would default-deny everything, including legitimate staff
-- access — equally wrong).
--
-- Roles covered, per task requirement:
--   owner, administrator, manager, housekeeping, technician,
--   public website (anon), server-side integration (service_role).
--
-- Housekeeping / technician: per the task, their access must remain
-- minimal even though their own operational tables (cleaning_tasks,
-- maintenance_requests, etc.) do not exist yet in Phase 1 — see the
-- explicit "Housekeeping and technician" section near the end of this
-- file rather than scattering minimal grants table-by-table.
--
-- Server-side integration role: the Supabase service_role key bypasses
-- RLS entirely by design and is not modeled as a bespoke Postgres role
-- with its own policies here — see the closing note in this file.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Additional RLS helper (depends on staff_property_assignments (0002)
-- and buildings (0003), both now available).
-- ---------------------------------------------------------------------

create or replace function public.assigned_building_ids()
returns setof uuid
language sql
stable
as $$
  select building_id
  from public.staff_property_assignments
  where user_id = auth.uid() and deleted_at is null;
$$;

comment on function public.assigned_building_ids() is
  'RLS helper: buildings the calling staff user is scoped to. Not used by '
  'any Phase 1 policy below (no Phase 1 table yet requires building-scoped '
  'access) — provided now because staff_property_assignments is a Phase 1 '
  'table and later operational-CRM policies (cleaning_tasks, '
  'maintenance_requests) will depend on it directly.';

-- ---------------------------------------------------------------------
-- Identity and roles
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
create policy profiles_self_select on public.profiles for select
  using (id = auth.uid() or public.has_role('owner') or public.has_role('administrator'));
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Row-level RLS above only scopes *which row* a user may update (their
-- own); it does not stop them setting every column on that row, including
-- is_active/deleted_at. Column-level privileges close that gap: a
-- self-service update may only ever touch full_name/phone. Reactivating
-- a deactivated account, or clearing deleted_at, requires an
-- administrative path outside this self-update grant (service_role or a
-- future dedicated admin RPC), never the user's own authenticated
-- session.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

alter table public.roles enable row level security;
create policy roles_staff_select on public.roles for select
  using (public.is_staff());
-- No insert/update/delete policy: the role catalog is fixed and changed
-- only via a reviewed migration, never by application traffic.

alter table public.user_roles enable row level security;
create policy user_roles_self_select on public.user_roles for select
  using (user_id = auth.uid() or public.has_role('owner') or public.has_role('administrator'));
create policy user_roles_admin_write on public.user_roles for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));
comment on policy user_roles_admin_write on public.user_roles is
  'Role grants are a governance action: only owner/administrator can '
  'insert/update/delete user_roles rows. Every such change is additionally '
  'captured in audit_log via trg_audit_user_roles (0007).';

alter table public.staff_property_assignments enable row level security;
create policy staff_assignments_self_select on public.staff_property_assignments for select
  using (user_id = auth.uid() or public.has_role('owner') or public.has_role('administrator'));
create policy staff_assignments_admin_write on public.staff_property_assignments for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

-- ---------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------

alter table public.properties enable row level security;
create policy properties_public_read on public.properties for select to anon using (true);
create policy properties_staff_read on public.properties for select using (public.is_staff());
create policy properties_admin_write on public.properties for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

alter table public.buildings enable row level security;
create policy buildings_public_read on public.buildings for select to anon
  using (deleted_at is null);
create policy buildings_staff_read on public.buildings for select using (public.is_staff());
create policy buildings_admin_write on public.buildings for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

alter table public.room_categories enable row level security;
create policy room_categories_public_read on public.room_categories for select to anon
  using (deleted_at is null);
create policy room_categories_staff_read on public.room_categories for select using (public.is_staff());
create policy room_categories_admin_write on public.room_categories for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

-- room_units: public website is read-only, sellable rooms only, no
-- broader anonymous access. Matches AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql
-- Section 11 exactly (already-approved pattern, carried forward as-is).
alter table public.room_units enable row level security;
create policy room_units_public_read on public.room_units for select
  to anon
  using (sellable_status = 'active' and deleted_at is null);
create policy room_units_staff_read on public.room_units for select
  using (public.is_staff());
create policy room_units_staff_write on public.room_units for update
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));
comment on policy room_units_public_read on public.room_units is
  'operational_status is exposed at row level to anon along with every '
  'other sellable-room column, matching the already-approved architecture '
  'draft. Hiding operational detail from anon at column granularity would '
  'require a dedicated public view and is flagged as a follow-up hardening '
  'item in the package report''s Known Risks, not implemented here to '
  'avoid deviating from the approved design.';

alter table public.room_bed_configurations enable row level security;
create policy bed_config_public_read on public.room_bed_configurations for select to anon using (true);
create policy bed_config_staff_read on public.room_bed_configurations for select using (public.is_staff());
create policy bed_config_admin_write on public.room_bed_configurations for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

alter table public.room_extra_capacity_rules enable row level security;
create policy extra_capacity_public_read on public.room_extra_capacity_rules for select to anon using (true);
create policy extra_capacity_staff_read on public.room_extra_capacity_rules for select using (public.is_staff());
create policy extra_capacity_admin_write on public.room_extra_capacity_rules for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

alter table public.amenities enable row level security;
create policy amenities_public_read on public.amenities for select to anon using (true);
create policy amenities_staff_read on public.amenities for select using (public.is_staff());
create policy amenities_admin_write on public.amenities for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

alter table public.room_amenities enable row level security;
create policy room_amenities_public_read on public.room_amenities for select to anon using (true);
create policy room_amenities_staff_read on public.room_amenities for select using (public.is_staff());
create policy room_amenities_admin_write on public.room_amenities for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

-- room_blocks: operational/reason detail (why a room is blocked) is not
-- public and not manager-writable — only owner/administrator create or
-- change blocks; manager may view for availability planning.
alter table public.room_blocks enable row level security;
create policy room_blocks_staff_select on public.room_blocks for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy room_blocks_admin_write on public.room_blocks for all
  using (public.has_role('owner') or public.has_role('administrator'))
  with check (public.has_role('owner') or public.has_role('administrator'));

-- ---------------------------------------------------------------------
-- CRM foundation
-- ---------------------------------------------------------------------

-- customers: contains PII (phone, email) — staff (owner/admin/manager)
-- only, never anon.
alter table public.customers enable row level security;
create policy customers_staff_all on public.customers for all
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

-- leads: public website may INSERT a new lead (the contact-form path)
-- but never SELECT/UPDATE — matches the approved draft.
alter table public.leads enable row level security;
create policy leads_public_insert on public.leads for insert
  to anon
  with check (true);
create policy leads_staff_select on public.leads for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
create policy leads_staff_write on public.leads for update
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
comment on policy leads_public_insert on public.leads is
  'Anonymous insert-only path for the public contact form. Rows are not '
  'readable back by anon (no anon select policy exists). Rate-limiting '
  'abusive anonymous inserts is an application/API-gateway concern outside '
  'database RLS and is called out as a Known Risk in the package report.';

alter table public.lead_status_history enable row level security;
create policy lead_status_history_staff_select on public.lead_status_history for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));
-- No write policy for any application role: rows are inserted only by
-- trg_leads_status_history (0004)'s log_lead_status_change(), a SECURITY
-- DEFINER trigger function (fixed search_path, EXECUTE revoked from
-- PUBLIC) that bypasses this table's RLS to write, exactly like
-- audit_log/fn_audit_row_change() below.

-- ---------------------------------------------------------------------
-- Booking core and integrity
-- ---------------------------------------------------------------------

alter table public.bookings enable row level security;
create policy bookings_staff_all on public.bookings for all
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

alter table public.booking_rooms enable row level security;
create policy booking_rooms_staff_all on public.booking_rooms for all
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

alter table public.booking_status_history enable row level security;
create policy booking_status_history_staff_select on public.booking_status_history for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

alter table public.availability_holds enable row level security;
create policy holds_staff_all on public.availability_holds for all
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'))
  with check (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

-- occupancy_periods: system-managed via SECURITY DEFINER triggers (0006).
-- No role is granted direct INSERT/UPDATE/DELETE here — staff get
-- read-only visibility for availability reporting.
alter table public.occupancy_periods enable row level security;
create policy occupancy_periods_staff_select on public.occupancy_periods for select
  using (public.has_role('owner') or public.has_role('administrator') or public.has_role('manager'));

-- ---------------------------------------------------------------------
-- Audit and integration
-- ---------------------------------------------------------------------

alter table public.audit_log enable row level security;
create policy audit_log_owner_only on public.audit_log for select
  using (public.has_role('owner'));
-- No insert/update/delete policy for any role: audit_log is written only
-- by fn_audit_row_change() (0007), a SECURITY DEFINER trigger function,
-- never directly by application-role users.

alter table public.integration_events enable row level security;
create policy integration_events_admin_select on public.integration_events for select
  using (public.has_role('owner') or public.has_role('administrator'));
-- No client write policy: populated by server-side integration code
-- using the service_role key, which bypasses RLS (see closing note).

alter table public.sheets_sync_queue enable row level security;
create policy sheets_sync_queue_admin_select on public.sheets_sync_queue for select
  using (public.has_role('owner') or public.has_role('administrator'));

alter table public.sheets_sync_history enable row level security;
create policy sheets_sync_history_admin_select on public.sheets_sync_history for select
  using (public.has_role('owner') or public.has_role('administrator'));

-- ---------------------------------------------------------------------
-- Housekeeping and technician (explicit, minimal, by omission)
-- ---------------------------------------------------------------------
-- Per task requirement: "Housekeeping and technician access should
-- remain minimal even if their operational tables are introduced in
-- later phases." None of the Phase 1 tables above grant housekeeping or
-- technician any policy beyond what every staff member already gets via
-- profiles_self_select/profiles_self_update (their own profile row only).
-- Concretely, in Phase 1, a housekeeping or technician account can:
--   - read and update their own public.profiles row;
--   - nothing else (no leads, customers, bookings, room_units write
--     access, room_blocks, audit_log, or sync tables).
-- This is intentional and will remain the minimal baseline even after
-- cleaning_tasks/maintenance_requests are added in a later package —
-- those tables will scope housekeeping/technician access to their own
-- assigned rows only (the pattern already shown in
-- AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql Section 11's
-- cleaning_tasks_housekeeping_select / maintenance_technician_select
-- policies), never broadened to full-table access.

-- ---------------------------------------------------------------------
-- Server-side integration role
-- ---------------------------------------------------------------------
-- The Supabase service_role key (used by Next.js API routes, the Sheets
-- sync worker, and payment/webhook handlers in later phases) bypasses
-- RLS entirely by design. It is intentionally NOT modeled as a bespoke
-- Postgres role with its own GRANT/policy set here, to stay inside
-- Supabase's standard security model rather than inventing a parallel
-- one. This key must never reach client code — see the package report's
-- Known Risks section for the isolation requirement.

commit;
