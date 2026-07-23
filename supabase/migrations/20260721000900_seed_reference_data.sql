-- =====================================================================
-- AK BERMET — Phase 1 Migration — 0009: Seed Reference Data
-- =====================================================================
-- STATUS: PREPARED, NOT EXECUTED. Depends on 0001-0008.
--
-- Seed Restrictions (per task): seed only safe reference data — roles,
-- booking statuses, room operational statuses, approved reference
-- values. Do NOT insert real customers, phones, emails, bookings,
-- payments, staff accounts, or credentials. This file inserts none of
-- those.
--
-- What is and is not seeded here, and why:
--
--   - roles: the fixed 5-row catalog (owner/administrator/manager/
--     housekeeping/technician) named explicitly in both approved tasks.
--     Seeded below.
--
--   - booking statuses / room operational statuses: in this design these
--     are PostgreSQL ENUM types (public.booking_status,
--     public.room_operational_status), created in 0001. An enum type
--     has no rows to seed — its values are already fixed by the CREATE
--     TYPE statement. Nothing further is required or inserted here for
--     these two items.
--
--   - properties / buildings: the resort itself (1 property row) and
--     the 8 buildings with their official unit/bed counts are explicitly
--     confirmed, approved figures in
--     AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN.md ("Known inventory" /
--     "Known object breakdown"). These are structural reference values,
--     not customer data, and are seeded below.
--
--   - room_categories, room_units (169 physical rooms), amenities,
--     room_bed_configurations, room_extra_capacity_rules: intentionally
--     NOT seeded by this package. Real category names, per-room floor/
--     number/capacity data, and amenity catalogs are operational data
--     that should come from a dedicated, reviewed data-migration task
--     (see architecture report Section 14/16), not be invented here.
--     Seeding placeholder/fake room rows would risk being mistaken for
--     real inventory later, which this package's restrictions exist to
--     prevent.
--
--   - customers, leads, bookings, payments, staff profiles: never
--     seeded here — explicitly forbidden by the task's Seed
--     Restrictions and Mandatory Restrictions ("import real customer
--     data" is out of scope).
-- =====================================================================

begin;

insert into public.roles (name, description) values
  ('owner', 'Full system access; only role able to view audit_log and clear a blocked room state.'),
  ('administrator', 'Operational management access across CRM, bookings, and inventory.'),
  ('manager', 'CRM and booking access; excluded from owner-only financial/system-administration data.'),
  ('housekeeping', 'Minimal access; scoped to assigned cleaning tasks once the operational-CRM package ships.'),
  ('technician', 'Minimal access; scoped to assigned maintenance requests once the operational-CRM package ships.')
on conflict (name) do nothing;

-- properties: single resort, defaults already match approved check-in/
-- check-out rules (13:00 / 11:00) declared in 0003.
insert into public.properties (name)
select 'AK BERMET'
where not exists (select 1 from public.properties where name = 'AK BERMET');

-- buildings: approved counts from AK_BERMET_SUPABASE_ARCHITECTURE_DESIGN.md
-- "Known object breakdown". 169 units / 407 official beds total.
insert into public.buildings (property_id, name, official_unit_count, official_bed_count)
select p.id, b.name, b.official_unit_count, b.official_bed_count
from public.properties p
cross join (values
  ('Corpus 1',      24, 55),
  ('Garden 1',      16, 32),
  ('Garden 2',      16, 32),
  ('Corpus 2',      28, 68),
  ('Corpus 3',      27, 63),
  ('Corpus 4',      22, 54),
  ('Brick Cottage', 14, 35),
  ('Log House',     22, 45)
) as b(name, official_unit_count, official_bed_count)
where p.name = 'AK BERMET'
on conflict (property_id, name) do nothing;

commit;
