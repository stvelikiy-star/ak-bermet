from pathlib import Path
import re

ROOT = Path('.')
route_path = ROOT / 'src/app/api/availability/route.ts'
supabase_path = ROOT / 'src/lib/supabase-admin.ts'
types_path = ROOT / 'src/types/availability.ts'
availability_path = ROOT / 'src/lib/availability.ts'
contract_path = ROOT / 'src/app/api/availability/route.contract.test.mjs'

# ---- route.ts ----
route = route_path.read_text(encoding='utf-8')
old_google = '''import {
  isGoogleSheetsEnabled,
  isLocalMockAvailabilityAllowed,
  getRoomsFromSheet,
  getOccupancyFromSheet,
} from "@/lib/google-sheets";
'''
if old_google not in route:
    raise SystemExit('expected Google Sheets availability import block missing')
route = route.replace(old_google, '', 1)
route = route.replace(
    '  createAvailabilityHoldRpc,\n  listActiveAvailabilityHolds,\n} from "@/lib/supabase-admin";',
    '  createAvailabilityHoldRpc,\n  loadAuthoritativeAvailability,\n} from "@/lib/supabase-admin";',
    1,
)
pattern = re.compile(
    r'// Загружает номера и занятость\..*?\nasync function loadRoomsAndOccupancy\(\): Promise<\{.*?\n\}\n\n// Предварительная проверка наличия\.',
    re.S,
)
replacement = '''// Mock availability is allowed only when explicitly selected in a local
// development/test runtime. Any non-mock runtime uses Supabase authority.
function isExplicitLocalMockAvailabilityAllowed(): boolean {
  const localRuntime =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  return localRuntime && process.env.AVAILABILITY_SOURCE === "mock";
}

// Production/non-mock availability is derived only from authoritative
// Supabase room_units + occupancy_periods, with active durable holds verified
// against their expiry. Any authority read failure fails closed.
async function loadRoomsAndOccupancy(): Promise<{
  rooms: typeof mockRooms;
  occupancy: typeof mockOccupancy;
  source: "supabase" | "mock";
}> {
  if (isExplicitLocalMockAvailabilityAllowed()) {
    return { rooms: mockRooms, occupancy: mockOccupancy, source: "mock" };
  }

  try {
    const { rooms, occupancy } = await loadAuthoritativeAvailability();
    return { rooms, occupancy, source: "supabase" };
  } catch {
    console.error("[AVAILABILITY] Authoritative Supabase read failed");
    throw new AvailabilityError(
      "availability_unknown",
      "Не удалось проверить доступность номеров. Повторите запрос позже."
    );
  }
}

// Предварительная проверка наличия.'''
route, count = pattern.subn(replacement, route, count=1)
if count != 1:
    raise SystemExit(f'loadRoomsAndOccupancy replacement count={count}')
route = route.replace('if (source === "sheets") {', 'if (source === "supabase") {', 1)
if '@/lib/google-sheets' in route or 'getRoomsFromSheet' in route or 'getOccupancyFromSheet' in route:
    raise SystemExit('Google Sheets availability dependency remains in route')
route_path.write_text(route, encoding='utf-8')

# ---- types/availability.ts ----
types = types_path.read_text(encoding='utf-8')
types = types.replace(
    '// Модель доступности (готовится под Stage 05 — Google Sheets / CRM).',
    '// Модель доступности: Supabase — операционный источник истины; mock только для явного local dev/test режима.',
    1,
)
types = types.replace(
    '  | "checking_out"\n  | "no_show"',
    '  | "checking_out"\n  | "maintenance_block"\n  | "stop_sale"\n  | "no_show"',
    1,
)
types = types.replace(
    '  "checking_out",\n];',
    '  "checking_out",\n  "maintenance_block",\n  "stop_sale",\n];',
    1,
)
if '"maintenance_block"' not in types or '"stop_sale"' not in types:
    raise SystemExit('blocking availability statuses not installed')
types_path.write_text(types, encoding='utf-8')

# ---- lib/availability.ts: documentation only; filtering logic already consumes blocking statuses ----
availability = availability_path.read_text(encoding='utf-8')
availability = availability.replace(
    '// TODO Stage 05: replace mock availability with Google Sheets API integration.',
    '// Mock inventory is a local development/test aid only. Non-mock availability is loaded from authoritative Supabase server-side.',
    1,
)
availability_path.write_text(availability, encoding='utf-8')

# ---- supabase-admin.ts ----
supabase = supabase_path.read_text(encoding='utf-8')
import_line = 'import { createClient, type SupabaseClient } from "@supabase/supabase-js";\n'
if import_line not in supabase:
    raise SystemExit('supabase import anchor missing')
supabase = supabase.replace(
    import_line,
    import_line + 'import type { OccupancyRecord, RoomUnit } from "@/types/availability";\n',
    1,
)
append = r'''

interface PublicAvailabilityRelationName {
  name?: string | null;
}

interface PublicAvailabilityRoomRow {
  id: string;
  room_number: string;
  floor: number | null;
  max_capacity: number;
  extra_places: number;
  view_side: string;
  has_wifi: boolean;
  distance_to_spa_meters: number | null;
  distance_to_beach_meters: number | null;
  sellable_status: string;
  operational_status: string;
  notes: string | null;
  buildings: PublicAvailabilityRelationName | PublicAvailabilityRelationName[] | null;
  room_categories: PublicAvailabilityRelationName | PublicAvailabilityRelationName[] | null;
}

interface PublicAvailabilityOccupancyRow {
  id: string;
  room_unit_id: string;
  period: string;
  period_type: "booking" | "hold" | "maintenance_block" | "stop_sale";
  availability_hold_id: string | null;
}

export class PublicAvailabilityReadError extends Error {
  constructor() {
    super("Authoritative public availability read failed");
    this.name = "PublicAvailabilityReadError";
  }
}

function firstPublicAvailabilityRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function parsePublicAvailabilityPeriod(period: string): { checkIn: string; checkOut: string } | null {
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(period);
  if (!match) return null;
  return { checkIn: match[1], checkOut: match[2] };
}

export async function loadAuthoritativeAvailability(
  now: Date = new Date(),
  client: SupabaseClient = getSupabaseAdminClient()
): Promise<{ rooms: RoomUnit[]; occupancy: OccupancyRecord[] }> {
  const [roomsResult, occupancyResult, activeHolds] = await Promise.all([
    client
      .from("room_units")
      .select(
        "id, room_number, floor, max_capacity, extra_places, view_side, has_wifi, distance_to_spa_meters, distance_to_beach_meters, sellable_status, operational_status, notes, buildings ( name ), room_categories ( name )"
      )
      .is("deleted_at", null),
    client
      .from("occupancy_periods")
      .select("id, room_unit_id, period, period_type, availability_hold_id")
      .eq("status", "active"),
    listActiveAvailabilityHolds(
      now,
      client as unknown as AvailabilityHoldReadClient
    ),
  ]);

  if (
    roomsResult.error ||
    occupancyResult.error ||
    !roomsResult.data ||
    !occupancyResult.data
  ) {
    throw new PublicAvailabilityReadError();
  }

  const activeHoldById = new Map(activeHolds.map((hold) => [hold.id, hold]));

  const rooms: RoomUnit[] = (
    roomsResult.data as unknown as PublicAvailabilityRoomRow[]
  ).map((row) => {
    const status: RoomUnit["status"] =
      row.sellable_status !== "active"
        ? "do_not_sell"
        : row.operational_status === "ready"
          ? "active"
          : "maintenance";
    const view: RoomUnit["view"] =
      row.view_side === "preferred_nature"
        ? "forest"
        : row.view_side === "service_yard"
          ? "yard"
          : "other";

    return {
      id: row.id,
      building:
        firstPublicAvailabilityRelation(row.buildings)?.name ?? "Без корпуса",
      floor: row.floor ?? undefined,
      roomNumber: row.room_number,
      category:
        firstPublicAvailabilityRelation(row.room_categories)?.name ??
        "Без категории",
      capacity: row.max_capacity,
      allowsExtraBed: row.extra_places > 0,
      view,
      hasWifi: row.has_wifi,
      distanceToSpaMeters: row.distance_to_spa_meters ?? undefined,
      distanceToBeachMeters: row.distance_to_beach_meters ?? undefined,
      status,
      notes: row.notes ?? undefined,
    };
  });

  const occupancy: OccupancyRecord[] = [];
  for (const row of occupancyResult.data as unknown as PublicAvailabilityOccupancyRow[]) {
    const range = parsePublicAvailabilityPeriod(row.period);
    if (!range) throw new PublicAvailabilityReadError();

    if (row.period_type === "hold") {
      if (!row.availability_hold_id) throw new PublicAvailabilityReadError();
      const activeHold = activeHoldById.get(row.availability_hold_id);
      if (!activeHold) continue;
      occupancy.push({
        id: row.id,
        roomId: row.room_unit_id,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        status: "pre_hold",
        expiresAt: activeHold.expires_at,
        source: "supabase",
      });
      continue;
    }

    occupancy.push({
      id: row.id,
      roomId: row.room_unit_id,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      status:
        row.period_type === "booking"
          ? "confirmed"
          : row.period_type,
      source: "supabase",
    });
  }

  return { rooms, occupancy };
}
'''
if 'export async function loadAuthoritativeAvailability(' in supabase:
    raise SystemExit('authoritative availability reader already exists unexpectedly')
supabase = supabase.rstrip() + append.rstrip() + '\n'
supabase_path.write_text(supabase, encoding='utf-8')

# ---- route contract ----
contract = r'''import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const supabase = fs.readFileSync(
  new URL("../../../lib/supabase-admin.ts", import.meta.url),
  "utf8"
);
const types = fs.readFileSync(
  new URL("../../../types/availability.ts", import.meta.url),
  "utf8"
);

test("public availability route no longer uses Google Sheets authority", () => {
  assert.doesNotMatch(route, /@\/lib\/google-sheets/);
  assert.doesNotMatch(route, /getRoomsFromSheet|getOccupancyFromSheet|isGoogleSheetsEnabled/);
  assert.match(route, /loadAuthoritativeAvailability/);
  assert.match(route, /source: "supabase"/);
});

test("mock availability requires explicit local selection", () => {
  assert.match(route, /NODE_ENV === "development"/);
  assert.match(route, /NODE_ENV === "test"/);
  assert.match(route, /AVAILABILITY_SOURCE === "mock"/);
});

test("authoritative reader uses Supabase room_units and occupancy_periods", () => {
  assert.match(supabase, /\.from\("room_units"\)/);
  assert.match(supabase, /\.from\("occupancy_periods"\)/);
  assert.match(supabase, /\.eq\("status", "active"\)/);
});

test("hold occupancy is accepted only through active nonexpired durable holds", () => {
  assert.match(supabase, /listActiveAvailabilityHolds/);
  assert.match(supabase, /activeHoldById/);
  assert.match(supabase, /if \(!activeHold\) continue/);
});

test("technical and stop-sale occupancy remain blocking", () => {
  assert.match(types, /\| "maintenance_block"/);
  assert.match(types, /\| "stop_sale"/);
  assert.match(types, /"maintenance_block",/);
  assert.match(types, /"stop_sale",/);
});

test("authoritative read failure fails closed with sanitized 503 path", () => {
  assert.match(route, /Authoritative Supabase read failed/);
  assert.match(route, /"availability_unknown"/);
  assert.match(route, /case "availability_unknown":\s*return 503/);
  assert.doesNotMatch(route, /console\.error\([^\n]*error/);
});

test("atomic production hold RPC and role gate are preserved", () => {
  assert.match(route, /createAvailabilityHoldRpc/);
  assert.match(route, /HOLD_CREATOR_ROLES/);
  assert.match(route, /owner/);
  assert.match(route, /administrator/);
  assert.match(route, /manager/);
  assert.match(route, /if \(source === "supabase"\)/);
});

test("authoritative room mapping keeps unsellable and nonready rooms unavailable", () => {
  assert.match(supabase, /sellable_status !== "active"/);
  assert.match(supabase, /operational_status === "ready"/);
  assert.match(supabase, /"do_not_sell"/);
  assert.match(supabase, /"maintenance"/);
});
'''
contract_path.write_text(contract, encoding='utf-8')

print('ISSUE147_PATCH_APPLIED')
