import assert from "node:assert/strict";
import test from "node:test";

import type {
  AvailabilityHoldRpcClient,
  SheetsBookingHoldRpcClient,
} from "./supabase-admin";

const modulePath = "./supabase-admin.ts";
const {
  OwnerActionRequiredError,
  createAvailabilityHoldForMappedRoom,
  listActiveAvailabilityHolds,
  mapOccupancyToInventoryRoomIds,
  prepareSheetsBookingSyncEvents,
  resolveRoomUnitMapping,
  syncSheetsBookingsAndCreateAvailabilityHold,
} = (await import(modulePath)) as typeof import("./supabase-admin");
const { occupancyRowToRecord } = (await import(
  "./google-sheets.ts"
)) as typeof import("./google-sheets");

const ROOM_UNIT_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_ROOM_UNIT_ID = "223e4567-e89b-42d3-a456-426614174000";

test("active holds are read from public.availability_holds and filtered by expires_at", async () => {
  const calls: Array<[string, unknown]> = [];
  const rows = [
    {
      id: "hold-1",
      room_unit_id: ROOM_UNIT_ID,
      check_in: "2026-08-10",
      check_out: "2026-08-11",
      status: "active",
      expires_at: "2026-08-04T12:00:00.000Z",
    },
  ];
  const query = {
    select(value: string) {
      calls.push(["select", value]);
      return this;
    },
    eq(column: string, value: unknown) {
      calls.push(["eq", [column, value]]);
      return this;
    },
    async gt(column: string, value: unknown) {
      calls.push(["gt", [column, value]]);
      return { data: rows, error: null };
    },
  };
  const client = {
    schema(schema: string) {
      calls.push(["schema", schema]);
      return {
        from(table: string) {
          calls.push(["from", table]);
          return query;
        },
      };
    },
  };

  const result = await listActiveAvailabilityHolds(
    new Date("2026-08-04T10:00:00.000Z"),
    client as never
  );

  assert.deepEqual(result, rows);
  assert.deepEqual(calls, [
    ["schema", "public"],
    ["from", "availability_holds"],
    [
      "select",
      "id, room_unit_id, check_in, check_out, status, created_at, expires_at",
    ],
    ["eq", ["status", "active"]],
    ["gt", ["expires_at", "2026-08-04T10:00:00.000Z"]],
  ]);
});

test("an external Sheets id resolves only through an explicit mapped UUID", () => {
  assert.deepEqual(
    resolveRoomUnitMapping("sheet-room-101", [
      { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
    ]),
    {
      status: "mapped",
      externalRoomId: "sheet-room-101",
      roomUnitId: ROOM_UNIT_ID,
    }
  );
});

test("missing and ambiguous room mappings are rejected", () => {
  assert.deepEqual(
    resolveRoomUnitMapping("sheet-room-101", [{ id: "sheet-room-101" }]),
    { status: "missing" }
  );
  assert.deepEqual(
    resolveRoomUnitMapping("sheet-room-101", [
      { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
      { id: "sheet-room-101", room_unit_id: OTHER_ROOM_UNIT_ID },
    ]),
    { status: "ambiguous" }
  );
});

test("duplicate external ids and duplicate UUID owners are rejected", () => {
  assert.deepEqual(
    resolveRoomUnitMapping("sheet-room-101", [
      { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
      { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
    ]),
    { status: "duplicated" }
  );
  assert.deepEqual(
    resolveRoomUnitMapping("sheet-room-101", [
      { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
      { id: "sheet-room-102", roomUnitId: ROOM_UNIT_ID },
    ]),
    { status: "duplicated" }
  );
});

test("OWNER_ACTION_REQUIRED prevents the hold RPC when mapping is absent", async () => {
  let rpcCalls = 0;
  const client: AvailabilityHoldRpcClient = {
    async rpc() {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };

  await assert.rejects(
    createAvailabilityHoldForMappedRoom(
      {
        externalRoomId: "sheet-room-101",
        rooms: [{ id: "sheet-room-101" }],
        checkIn: "2026-08-10",
        checkOut: "2026-08-11",
        heldBy: "staff-1",
        idempotencyKey: "request-1",
      },
      client
    ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError &&
      error.code === "OWNER_ACTION_REQUIRED" &&
      error.reason === "missing"
  );
  assert.equal(rpcCalls, 0);
});

test("an ambiguous mapping also returns OWNER_ACTION_REQUIRED without RPC", async () => {
  let rpcCalls = 0;
  const client: AvailabilityHoldRpcClient = {
    async rpc() {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };

  await assert.rejects(
    createAvailabilityHoldForMappedRoom(
      {
        externalRoomId: "sheet-room-101",
        rooms: [
          { id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID },
          { id: "sheet-room-101", roomUnitId: OTHER_ROOM_UNIT_ID },
        ],
        checkIn: "2026-08-10",
        checkOut: "2026-08-11",
        heldBy: "staff-1",
        idempotencyKey: "request-2",
      },
      client
    ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError &&
      error.code === "OWNER_ACTION_REQUIRED" &&
      error.reason === "ambiguous"
  );
  assert.equal(rpcCalls, 0);
});

test("the mapped room_units UUID, never the external id, is sent to RPC", async () => {
  let rpcRoomUnitId: string | undefined;
  const client: AvailabilityHoldRpcClient = {
    async rpc(_name, params) {
      rpcRoomUnitId = params.p_room_unit_id;
      return {
        data: {
          id: "hold-1",
          room_unit_id: params.p_room_unit_id,
          check_in: params.p_check_in,
          check_out: params.p_check_out,
          status: "active",
        },
        error: null,
      };
    },
  };

  await createAvailabilityHoldForMappedRoom(
    {
      externalRoomId: "sheet-room-101",
      rooms: [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID.toUpperCase() }],
      checkIn: "2026-08-10",
      checkOut: "2026-08-11",
      heldBy: "staff-1",
      idempotencyKey: "request-1",
    },
    client
  );

  assert.equal(rpcRoomUnitId, ROOM_UNIT_ID);
  assert.notEqual(rpcRoomUnitId, "sheet-room-101");
});

test("a held UUID is canonicalized to the external inventory id and excluded", () => {
  const rooms = [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }];
  const normalized = mapOccupancyToInventoryRoomIds(
    [
      {
        id: "hold-1",
        roomId: ROOM_UNIT_ID.toUpperCase(),
        checkIn: "2026-08-10",
        checkOut: "2026-08-11",
        source: "supabase",
      },
    ],
    rooms
  );

  assert.equal(normalized[0].roomId, "sheet-room-101");
  const availableRoomIds = rooms
    .filter((room) => !normalized.some((entry) => entry.roomId === room.id))
    .map((room) => room.id);
  assert.deepEqual(availableRoomIds, []);
});

test("an unmapped durable hold fails closed with OWNER_ACTION_REQUIRED", () => {
  assert.throws(
    () =>
      mapOccupancyToInventoryRoomIds(
        [{ roomId: ROOM_UNIT_ID, source: "supabase" }],
        [{ id: "sheet-room-101" }]
      ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError &&
      error.code === "OWNER_ACTION_REQUIRED"
  );
});

test("a hold already using the external id is excluded without format drift", () => {
  const normalized = mapOccupancyToInventoryRoomIds(
    [{ roomId: "sheet-room-101", source: "supabase" }],
    [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }]
  );
  assert.equal(normalized[0].roomId, "sheet-room-101");
});

test("blocking Sheets bookings become deterministic UUID-backed sync events", () => {
  const events = prepareSheetsBookingSyncEvents(
    [
      {
        id: "booking-stable-1",
        roomId: "sheet-room-101",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        status: "confirmed",
        sourceUpdatedAt: "2026-08-04T10:15:00+00:00",
      },
    ],
    [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }]
  );

  assert.equal(events.length, 1);
  assert.deepEqual(
    {
      ...events[0],
      event_fingerprint: "<sha256>",
    },
    {
      external_booking_id: "booking-stable-1",
      room_unit_id: ROOM_UNIT_ID,
      check_in: "2026-08-10",
      check_out: "2026-08-12",
      source_status: "confirmed",
      blocks_availability: true,
      source_updated_at: "2026-08-04T10:15:00.000Z",
      event_fingerprint: "<sha256>",
    }
  );
  assert.match(events[0].event_fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    prepareSheetsBookingSyncEvents(
      [
        {
          id: "booking-stable-1",
          roomId: "sheet-room-101",
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
          status: "confirmed",
          sourceUpdatedAt: "2026-08-04T10:15:00Z",
        },
        {
          id: "booking-stable-1",
          roomId: "sheet-room-101",
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
          status: "confirmed",
          sourceUpdatedAt: "2026-08-04T10:15:00Z",
        },
      ],
      [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }]
    ).length,
    1
  );
});

test("cancelled Sheets events are durable non-blocking updates", () => {
  const [event] = prepareSheetsBookingSyncEvents(
    [
      {
        id: "booking-stable-1",
        roomId: "sheet-room-101",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        status: "cancelled",
        sourceUpdatedAt: "2026-08-04T11:00:00Z",
      },
    ],
    [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }]
  );
  assert.equal(event.blocks_availability, false);
});

test("out-of-order Sheets events retain only the greatest source version", () => {
  const older = {
    id: "booking-stable-1",
    roomId: "sheet-room-101",
    checkIn: "2026-08-10",
    checkOut: "2026-08-12",
    status: "confirmed" as const,
    sourceUpdatedAt: "2026-08-04T10:15:00Z",
  };
  const newer = {
    ...older,
    status: "cancelled" as const,
    sourceUpdatedAt: "2026-08-04T11:00:00Z",
  };
  const rooms = [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }];

  for (const occupancy of [
    [older, newer],
    [newer, older],
  ]) {
    const events = prepareSheetsBookingSyncEvents(occupancy, rooms);
    assert.equal(events.length, 1);
    assert.equal(events[0].source_status, "cancelled");
    assert.equal(events[0].blocks_availability, false);
    assert.equal(events[0].source_updated_at, "2026-08-04T11:00:00.000Z");
  }
});

test("equal-version conflicts prevent the transactional hold RPC", async () => {
  let rpcCalls = 0;
  const client: SheetsBookingHoldRpcClient = {
    async rpc() {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };

  await assert.rejects(
    syncSheetsBookingsAndCreateAvailabilityHold(
      {
        externalRoomId: "sheet-room-101",
        rooms: [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }],
        occupancy: [
          {
            id: "booking-stable-1",
            roomId: "sheet-room-101",
            checkIn: "2026-08-10",
            checkOut: "2026-08-12",
            status: "confirmed",
            sourceUpdatedAt: "2026-08-04T10:15:00Z",
          },
          {
            id: "booking-stable-1",
            roomId: "sheet-room-101",
            checkIn: "2026-08-10",
            checkOut: "2026-08-12",
            status: "cancelled",
            sourceUpdatedAt: "2026-08-04T10:15:00+00:00",
          },
        ],
        checkIn: "2026-08-20",
        checkOut: "2026-08-21",
        heldBy: "staff-1",
        idempotencyKey: "request-sync-version-conflict",
      },
      client
    ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError && error.reason === "ambiguous"
  );
  assert.equal(rpcCalls, 0);
});

test("missing source version prevents the transactional hold RPC", async () => {
  let rpcCalls = 0;
  const client: SheetsBookingHoldRpcClient = {
    async rpc() {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };

  await assert.rejects(
    syncSheetsBookingsAndCreateAvailabilityHold(
      {
        externalRoomId: "sheet-room-101",
        rooms: [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }],
        occupancy: [
          {
            id: "booking-stable-1",
            roomId: "sheet-room-101",
            checkIn: "2026-08-10",
            checkOut: "2026-08-12",
            status: "confirmed",
          },
        ],
        checkIn: "2026-08-20",
        checkOut: "2026-08-21",
        heldBy: "staff-1",
        idempotencyKey: "request-sync-1",
      },
      client
    ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError && error.reason === "invalid"
  );
  assert.equal(rpcCalls, 0);
});

test("missing Sheets booking status is not invented and prevents the hold RPC", async () => {
  let rpcCalls = 0;
  const client: SheetsBookingHoldRpcClient = {
    async rpc() {
      rpcCalls += 1;
      return { data: null, error: null };
    },
  };
  const row = occupancyRowToRecord([
    "booking-stable-1",
    "sheet-room-101",
    "2026-08-10",
    "2026-08-12",
    "",
    "Guest",
    "",
    "sheets",
    "",
    "",
    "2026-08-04T10:15:00Z",
  ]);

  assert.equal(row.status, "");
  await assert.rejects(
    syncSheetsBookingsAndCreateAvailabilityHold(
      {
        externalRoomId: "sheet-room-101",
        rooms: [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }],
        occupancy: [row],
        checkIn: "2026-08-20",
        checkOut: "2026-08-21",
        heldBy: "staff-1",
        idempotencyKey: "request-sync-missing-status",
      },
      client
    ),
    (error: unknown) =>
      error instanceof OwnerActionRequiredError &&
      error.code === "OWNER_ACTION_REQUIRED" &&
      error.reason === "invalid"
  );
  assert.equal(rpcCalls, 0);
});

test("Sheets events are synchronized in the same RPC before hold creation", async () => {
  let rpcName: string | undefined;
  let rpcParams: Parameters<SheetsBookingHoldRpcClient["rpc"]>[1] | undefined;
  const client: SheetsBookingHoldRpcClient = {
    async rpc(name, params) {
      rpcName = name;
      rpcParams = params;
      return {
        data: {
          id: "hold-after-sync",
          room_unit_id: params.p_room_unit_id,
          check_in: params.p_check_in,
          check_out: params.p_check_out,
          status: "active",
        },
        error: null,
      };
    },
  };

  await syncSheetsBookingsAndCreateAvailabilityHold(
    {
      externalRoomId: "sheet-room-101",
      rooms: [{ id: "sheet-room-101", roomUnitId: ROOM_UNIT_ID }],
      occupancy: [
        {
          id: "booking-stable-1",
          roomId: "sheet-room-101",
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
          status: "confirmed",
          sourceUpdatedAt: "2026-08-04T10:15:00Z",
        },
      ],
      checkIn: "2026-08-20",
      checkOut: "2026-08-21",
      heldBy: "staff-1",
      idempotencyKey: "request-sync-2",
    },
    client
  );

  assert.equal(
    rpcName,
    "fn_sync_sheets_bookings_and_create_availability_hold"
  );
  assert.equal(rpcParams?.p_room_unit_id, ROOM_UNIT_ID);
  assert.equal(rpcParams?.p_events.length, 1);
  assert.equal(rpcParams?.p_events[0].external_booking_id, "booking-stable-1");
});
