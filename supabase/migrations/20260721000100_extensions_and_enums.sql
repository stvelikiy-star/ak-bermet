-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0001: Extensions & Enums
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED.
-- Produced under task AK_BERMET_PHASE1_MIGRATION_PACKAGE.md. No statement
-- in this file (or any file in this package) has been run against any
-- database. Do not apply outside a reviewed staging/CI run.
--
-- Source of truth this package packages:
--   - AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN_REPORT.md
--   - AK_BERMET_SUPABASE_SCHEMA_DRAFT.sql
-- This file narrows that full (56-table) draft down to the Phase 1 subset
-- approved in AK_BERMET_PHASE1_MIGRATION_PACKAGE.md: foundation, identity,
-- inventory, CRM foundation, booking integrity, audit/integration.
-- Payments, operational CRM (cleaning/maintenance), AI/knowledge tables,
-- messaging, and photo storage are explicitly OUT of Phase 1 scope and are
-- deferred to later migration packages per the architecture report's
-- recommended sequence (Section 15).
--
-- Apply order: 0001 -> 0002 -> ... -> 0009. 0010 is read-only validation.
-- Down-migration: see ROLLBACK.sql (reverse order).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;    -- gen_random_uuid()
create extension if not exists btree_gist;  -- required for EXCLUDE USING gist
                                             -- (booking/hold/block overlap
                                             -- prevention, see 0006).

-- ---------------------------------------------------------------------
-- Enumerated types (Phase 1 subset only — no payment/operational-CRM/
-- AI enums are declared here; they belong to their own later packages).
-- ---------------------------------------------------------------------

create type public.role_name as enum (
  'owner',
  'administrator',
  'manager',
  'housekeeping',
  'technician'
);

create type public.lead_source as enum (
  'website', 'ai_chat', 'whatsapp', 'phone', 'instagram', 'tour_agency', 'manual'
);

create type public.lead_interest as enum (
  'rooms', 'garden', 'hot_springs', 'spa', 'events', 'food', 'promo', 'general'
);

create type public.lead_status as enum (
  'new', 'in_progress', 'waiting_admin', 'waiting_prepayment', 'prepaid',
  'confirmed', 'cancelled', 'lost'
);

create type public.preferred_contact as enum ('whatsapp', 'phone');

create type public.view_side as enum ('preferred_nature', 'service_yard');
-- Stored explicitly rather than derived from room_number parity, because
-- physical exceptions (corner units, historical renumbering) must be able
-- to override the odd/even rule without a schema change.

create type public.bed_type as enum ('single', 'double', 'twin', 'sofa_bed', 'mixed');

create type public.room_sellable_status as enum ('active', 'inactive', 'do_not_sell');
-- Commercial "is this offered at all" switch — independent of the live
-- operational/turnover status below.

create type public.room_operational_status as enum (
  'checkout_pending',
  'cleaning_required',
  'cleaning_in_progress',
  'inspection_required',
  'ready',
  'maintenance_required',
  'maintenance_in_progress',
  'blocked'
);
-- The 8-state model is declared here (Phase 1) because room_units carries
-- this column from day one; the cleaning_tasks/maintenance_requests
-- workflow tables that drive transitions are a later phase, per the
-- architecture report's Section 15 sequencing.

create type public.room_block_type as enum (
  'maintenance', 'technical', 'stop_sale', 'owner_use', 'other'
);

create type public.booking_status as enum (
  'pending_confirmation', 'confirmed', 'checked_in', 'checked_out',
  'cancelled', 'no_show'
);

create type public.hold_status as enum ('active', 'converted', 'released', 'expired');

create type public.occupancy_period_type as enum (
  'booking', 'hold', 'maintenance_block', 'stop_sale'
);

create type public.occupancy_period_status as enum ('active', 'released', 'cancelled', 'expired');

create type public.sync_direction as enum ('supabase_to_sheets', 'sheets_to_supabase');
create type public.sync_status as enum ('pending', 'in_progress', 'success', 'failed');

-- ---------------------------------------------------------------------
-- Shared helper functions
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at = now() on every row update.';

-- Human-readable public identifiers. One sequence per Phase 1 business
-- object type. Sequences for payment/cleaning-task/maintenance-request
-- numbers are declared in their own future migration packages, not here.
create sequence if not exists public.lead_number_seq;
create sequence if not exists public.booking_number_seq;

create or replace function public.generate_public_number(p_prefix text, p_seq_name text)
returns text
language plpgsql
as $$
declare
  v_next bigint;
begin
  v_next := nextval(p_seq_name);
  return p_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 6, '0');
end;
$$;

comment on function public.generate_public_number(text, text) is
  'Builds a human-facing identifier like LEAD-2026-000123. Used by BEFORE '
  'INSERT triggers on leads/bookings. Never used as a join key — UUID '
  'primary keys remain the sole referential-integrity key. Note: a rolled- '
  'back transaction burns a sequence value, leaving a visible but harmless '
  'gap; this is cosmetic, not a data-loss signal.';

commit;
