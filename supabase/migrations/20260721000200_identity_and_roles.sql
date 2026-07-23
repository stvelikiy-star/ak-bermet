-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0002: Identity & Roles
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001.
--
-- Supabase Auth integration assumption (per architecture report Section
-- 10): Supabase Auth (email+password or magic link) replaces the current
-- MANAGER_ACCESS_PIN shared-cookie mechanism entirely. auth.users is
-- managed by Supabase and is NOT modified by this file. Sessions are
-- delegated entirely to auth.sessions / auth.refresh_tokens — no custom
-- session table is created. Guests/customers are never given auth.users
-- accounts; customers/leads (0004) remain plain data rows.
-- =====================================================================

begin;

-- profiles: 1:1 extension of auth.users. Every staff member (owner/
-- administrator/manager/housekeeping/technician) gets a real Supabase
-- Auth account and exactly one profiles row.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
comment on table public.profiles is
  'One row per staff Supabase Auth user. Guests/customers are never in auth.users.';

-- roles: fixed catalog. Seed rows are inserted by 0009 (reference data
-- only — no real staff accounts are created by this package).
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.role_name not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- user_roles: many-to-many profiles<->roles. Additive: a person may hold
-- more than one role (e.g. an owner acting as administrator), so RLS
-- policies (0008) check has_role('x') explicitly rather than assuming
-- role exclusivity.
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, role_id)
);
create index idx_user_roles_user on public.user_roles(user_id) where deleted_at is null;

-- staff_property_assignments: scopes housekeeping/technician (and
-- optionally manager) visibility to specific buildings. Used by RLS
-- (0008) to keep housekeeping/technician access minimal and assignment-
-- scoped, per the task's RLS Requirements.
--
-- FORWARD REFERENCE NOTE: building_id references public.buildings, which
-- does not exist until 0003 runs. The column is declared here without a
-- foreign key; 0003 adds the FK constraint immediately after creating
-- buildings. This mirrors the ordering already documented in
-- AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql Section 3/4.
create table public.staff_property_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, building_id)
);

-- ---------------------------------------------------------------------
-- RLS helper functions (used by 0008). Declared here because they only
-- depend on tables created in this file.
--
-- SECURITY DEFINER with a fixed search_path, owned by the migration role
-- (not subject to RLS): these helpers are invoked from *inside* the RLS
-- policies on public.user_roles/public.roles themselves (see 0008). If
-- they ran as invoker (the caller's own privileges), their internal
-- reads of user_roles would themselves be subject to user_roles' RLS
-- policies, which call has_role()/is_staff() again — infinite recursion.
-- Running as SECURITY DEFINER makes these internal reads bypass RLS
-- entirely (the defining role owns the tables), breaking the cycle.
-- EXECUTE is revoked from PUBLIC and granted only to anon/authenticated:
-- anon is required because several Phase 1 policies (e.g.
-- properties_staff_read) omit a `to` clause and therefore apply to every
-- role, including anon, when combined via OR with an anon-facing public
-- policy on the same table.
-- ---------------------------------------------------------------------

create or replace function public.has_role(p_role public.role_name)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where auth.uid() is not null
      and ur.user_id = auth.uid()
      and r.name = p_role
      and ur.deleted_at is null
  );
$$;

revoke all on function public.has_role(public.role_name) from public;
grant execute on function public.has_role(public.role_name) to anon, authenticated;

comment on function public.has_role(public.role_name) is
  'RLS helper: true if the authenticated user holds the given role. Roles '
  'are additive (a user may hold more than one), so policies that must '
  'exclude e.g. managers from owner-only data check has_role(''owner'') '
  'explicitly rather than assuming role exclusivity. SECURITY DEFINER with '
  'a fixed search_path to avoid recursive RLS evaluation on user_roles '
  '(see the comment above); PUBLIC execution is revoked.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where auth.uid() is not null
      and ur.user_id = auth.uid()
      and ur.deleted_at is null
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

commit;
