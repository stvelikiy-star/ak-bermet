-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0003: Inventory
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001, 0002.
--
-- Phase 1 inventory scope (per AK_BERMET_PHASE1_MIGRATION_PACKAGE.md):
-- properties, buildings, room_categories, room_units, bed configurations,
-- extra-capacity rules, room amenities, room blocks.
--
-- OUT OF PHASE 1 SCOPE (deferred to a later package, per architecture
-- report Section 15 wave 5 / Section 19 Phase 3-4): room_photos,
-- room_pricing_periods. Neither is required for booking-integrity
-- correctness and both are additive later without breaking this file.
-- =====================================================================

begin;

-- properties: single resort today, modeled as a table so a second
-- property never requires a schema change.
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Bishkek',
  check_in_time time not null default '13:00',
  check_out_time time not null default '11:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- buildings: Corpus 1-4, Garden 1-2, Brick Cottage, Log House.
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  name text not null,
  official_unit_count integer not null,
  official_bed_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (property_id, name),
  check (official_unit_count > 0),
  check (official_bed_count > 0)
);
create trigger trg_buildings_updated_at before update on public.buildings
  for each row execute function public.set_updated_at();
comment on table public.buildings is
  'Seed data (0009, reference values only): 8 rows matching the approved '
  'inventory — Corpus 1 (24/55), Garden 1 (16/32), Garden 2 (16/32), '
  'Corpus 2 (28/68), Corpus 3 (27/63), Corpus 4 (22/54), Brick Cottage '
  '(14/35), Log House (22/45).';

-- Resolves the forward reference declared in 0002.
alter table public.staff_property_assignments
  add constraint fk_staff_assignments_building
  foreign key (building_id) references public.buildings(id) on delete cascade;

-- room_categories: "Люкс", "Полулюкс", "Garden люкс", "Семейный
-- 4-местный", etc. Not seeded by this package (see 0009 rationale) —
-- exact category names/pricing are a data decision, not a structural one.
create table public.room_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  name text not null,
  description text,
  base_bed_type public.bed_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (property_id, name)
);
create trigger trg_room_categories_updated_at before update on public.room_categories
  for each row execute function public.set_updated_at();

-- room_units: the physical, sellable unit. One row per each of the 169
-- units at full data migration; this package creates the table only —
-- seeding real room inventory rows is a data-migration task, not this
-- structural package (see 0009 Seed Restrictions).
create table public.room_units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete restrict,
  room_category_id uuid not null references public.room_categories(id) on delete restrict,
  floor integer,
  room_number text not null,
  official_beds integer not null,
  max_capacity integer not null,
  extra_places integer not null default 0,
  view_side public.view_side not null,
  has_wifi boolean not null default true,
  distance_to_spa_meters integer,
  distance_to_beach_meters integer,
  sellable_status public.room_sellable_status not null default 'active',
  operational_status public.room_operational_status not null default 'ready',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (building_id, room_number),
  check (max_capacity >= official_beds),
  check (extra_places >= 0),
  check (official_beds > 0)
);
create trigger trg_room_units_updated_at before update on public.room_units
  for each row execute function public.set_updated_at();
create index idx_room_units_building on public.room_units(building_id) where deleted_at is null;
create index idx_room_units_operational_status on public.room_units(operational_status) where deleted_at is null;
create index idx_room_units_sellable on public.room_units(sellable_status) where deleted_at is null;
comment on table public.room_units is
  '169 rows expected once real inventory data is migrated (a separate, '
  'data-only task). official_beds is expected to sum to 407 and '
  'max_capacity to 484 across all rows — validated by a reconciliation '
  'query (see 0010), not a DB constraint, since building-level totals on '
  'public.buildings are informational and must not silently drift out of '
  'sync with per-unit sums enforced here.';

-- room_bed_configurations: normalized bed layout per unit (a room can
-- have more than one bed line, e.g. 1 double + 1 sofa_bed).
create table public.room_bed_configurations (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  bed_type public.bed_type not null,
  bed_count integer not null default 1,
  created_at timestamptz not null default now(),
  check (bed_count > 0)
);
create index idx_bed_config_room on public.room_bed_configurations(room_unit_id);

-- room_extra_capacity_rules: pricing/eligibility for extra beds & extra
-- meals, per room category. Encodes the approved rules directly (children
-- charged from age 3; child extra bed 1500 KGS; child meal 1440 KGS;
-- adult extra bed/meal 1800 KGS) as defaults, overridable per category.
create table public.room_extra_capacity_rules (
  id uuid primary key default gen_random_uuid(),
  room_category_id uuid not null references public.room_categories(id) on delete cascade,
  max_extra_beds integer not null default 0,
  child_min_chargeable_age integer not null default 3,
  child_extra_bed_price_kgs numeric(10,2) not null default 1500,
  child_meal_price_kgs numeric(10,2) not null default 1440,
  adult_extra_bed_price_kgs numeric(10,2) not null default 1800,
  adult_extra_meal_price_kgs numeric(10,2) not null default 1800,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);
create trigger trg_extra_capacity_updated_at before update on public.room_extra_capacity_rules
  for each row execute function public.set_updated_at();

-- amenities: dictionary (Wi-Fi, AC, sofa, balcony, ...). Not seeded by
-- this package beyond what 0009 explicitly documents as safe reference
-- data.
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label_ru text not null,
  created_at timestamptz not null default now()
);

-- room_amenities: junction.
create table public.room_amenities (
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (room_unit_id, amenity_id)
);

-- room_blocks: technical/maintenance/stop-sale blocks at the room level
-- (distinct from a maintenance_request work ticket, which belongs to the
-- later Operational CRM package). A block is the calendar-availability
-- side effect; occupancy_periods (0006) is what actually makes it prevent
-- booking.
--
-- NOTE: maintenance_request_id is intentionally NOT a column here.
-- maintenance_requests is an Operational CRM table (out of Phase 1 scope
-- per the task). When that later package ships, it will add a nullable
-- maintenance_request_id column + FK to this table, exactly as the full
-- architecture draft anticipates.
create table public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_unit_id uuid not null references public.room_units(id) on delete cascade,
  block_type public.room_block_type not null,
  date_range daterange not null,
  reason text,
  created_by uuid not null references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (not isempty(date_range))
);
create trigger trg_room_blocks_updated_at before update on public.room_blocks
  for each row execute function public.set_updated_at();
create index idx_room_blocks_room on public.room_blocks(room_unit_id) where is_active;

commit;
