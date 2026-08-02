import test from "node:test";
import assert from "node:assert/strict";
import {
  mockRooms,
  filterRooms,
  createHold,
  listActiveHolds,
  resetHoldStoreForTests,
  isOccupancyBlocking,
  parseDateRange,
  parseGuests,
  AvailabilityError,
} from "./availability.ts";
import type { OccupancyRecord, RoomUnit } from "@/types/availability";

test("parseDateRange rejects malformed and inverted dates", () => {
  assert.equal(parseDateRange(undefined, undefined), null);
  assert.throws(() => parseDateRange("2026-08-01", undefined), (e: unknown) => {
    assert.ok(e instanceof AvailabilityError);
    assert.equal(e.code, "invalid_date_range");
    return true;
  });
  assert.throws(() => parseDateRange("not-a-date", "2026-08-02"), (e: unknown) => {
    assert.ok(e instanceof AvailabilityError);
    assert.equal(e.code, "invalid_date");
    return true;
  });
  assert.throws(() => parseDateRange("2026-02-30", "2026-08-02"), (e: unknown) => {
    assert.ok(e instanceof AvailabilityError);
    assert.equal(e.code, "invalid_date");
    return true;
  });
  assert.throws(() => parseDateRange("2026-08-05", "2026-08-01"), (e: unknown) => {
    assert.ok(e instanceof AvailabilityError);
    assert.equal(e.code, "invalid_date_range");
    return true;
  });
  const ok = parseDateRange("2026-08-01", "2026-08-05");
  assert.ok(ok);
});

test("parseGuests rejects zero, negative and non-integer values", () => {
  assert.equal(parseGuests(null), undefined);
  assert.equal(parseGuests(""), undefined);
  assert.equal(parseGuests("2"), 2);
  for (const bad of ["0", "-1", "abc", "1.5", "Infinity"]) {
    assert.throws(() => parseGuests(bad), (e: unknown) => {
      assert.ok(e instanceof AvailabilityError);
      assert.equal(e.code, "invalid_guests");
      return true;
    });
  }
});

test("availability reads keep mock inventory usable without roomNumber", () => {
  assert.ok(mockRooms.length > 0);
  assert.ok(mockRooms.every((room) => room.roomNumber === undefined));

  const items = filterRooms(mockRooms, {
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
  });
  assert.equal(
    items.length,
    mockRooms.filter((room) => room.status === "active").length
  );
});

test("hold creation uses source inventory when persisted room_units is unseeded", () => {
  resetHoldStoreForTests();
  // The mock path deliberately has no room_units mapping. Hold validation
  // must use the loaded source inventory instead of treating an absent DB
  // mapping as an unknown room.
  assert.ok(mockRooms.every((room) => room.roomNumber === undefined));
  const hold = createHold(
    {
      roomId: mockRooms[0].id,
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      idempotencyKey: "mock-room-without-number",
    },
    mockRooms,
    [],
    new Date("2026-08-01T10:00:00.000Z")
  );
  assert.equal(hold.roomId, mockRooms[0].id);
  resetHoldStoreForTests();
});

test("filterRooms excludes rooms with overlapping active occupancy", () => {
  const roomId = mockRooms[0].id;
  const occupancy: OccupancyRecord[] = [
    {
      id: "occ_1",
      roomId,
      checkIn: "2026-08-01",
      checkOut: "2026-08-05",
      status: "confirmed",
    },
  ];

  const overlapping = filterRooms(
    mockRooms,
    { checkIn: "2026-08-03", checkOut: "2026-08-06" },
    occupancy
  );
  assert.equal(
    overlapping.length,
    mockRooms.filter((r) => r.status === "active").length - 1
  );

  const nonOverlapping = filterRooms(
    mockRooms,
    { checkIn: "2026-08-05", checkOut: "2026-08-08" },
    occupancy
  );
  assert.equal(nonOverlapping.length, mockRooms.filter((r) => r.status === "active").length);
});

test("expired pre_hold occupancy does not block availability", () => {
  const roomId = mockRooms[0].id;
  const now = new Date("2026-08-01T12:00:00.000Z");
  const expiredHold: OccupancyRecord = {
    id: "occ_expired",
    roomId,
    checkIn: "2026-08-01",
    checkOut: "2026-08-05",
    status: "pre_hold",
    expiresAt: "2026-08-01T11:00:00.000Z",
  };
  assert.equal(isOccupancyBlocking(expiredHold, now), false);

  const items = filterRooms(
    mockRooms,
    { checkIn: "2026-08-01", checkOut: "2026-08-05" },
    [expiredHold],
    now
  );
  assert.equal(items.length, mockRooms.filter((r) => r.status === "active").length);
});

test("createHold prevents double booking on repeated and parallel requests", () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[0].id;
  const now = new Date("2026-08-01T10:00:00.000Z");

  const first = createHold(
    { roomId, checkIn: "2026-08-10", checkOut: "2026-08-12" },
    mockRooms,
    [],
    now
  );
  assert.equal(first.status, "pre_hold");
  assert.equal(first.expiresAt, new Date(now.getTime() + 60 * 60_000).toISOString());

  assert.throws(
    () =>
      createHold(
        { roomId, checkIn: "2026-08-11", checkOut: "2026-08-13" },
        mockRooms,
        [],
        now
      ),
    (e: unknown) => {
      assert.ok(e instanceof AvailabilityError);
      assert.equal(e.code, "hold_conflict");
      return true;
    }
  );

  const results = [1, 2, 3, 4, 5].map(() => {
    try {
      createHold(
        { roomId, checkIn: "2026-08-10", checkOut: "2026-08-12" },
        mockRooms,
        [],
        now
      );
      return "ok";
    } catch (e) {
      return e instanceof AvailabilityError ? e.code : "unknown";
    }
  });
  assert.equal(results.filter((r) => r === "ok").length, 0);
  assert.ok(results.every((r) => r === "hold_conflict"));

  assert.equal(listActiveHolds(now).length, 1);
  resetHoldStoreForTests();
});

test("createHold releases the room again once the hold expires", () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[1].id;
  const now = new Date("2026-08-01T10:00:00.000Z");
  createHold(
    { roomId, checkIn: "2026-08-10", checkOut: "2026-08-12" },
    mockRooms,
    [],
    now
  );

  const later = new Date(now.getTime() + 61 * 60_000);
  const second = createHold(
    { roomId, checkIn: "2026-08-10", checkOut: "2026-08-12" },
    mockRooms,
    [],
    later
  );
  assert.equal(second.status, "pre_hold");
  resetHoldStoreForTests();
});

test("delayed idempotent retry returns the original expired hold", () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[1].id;
  const now = new Date("2026-08-01T10:00:00.000Z");
  const request = {
    roomId,
    checkIn: "2026-08-10",
    checkOut: "2026-08-12",
    guestName: "Test Guest",
    guestPhone: "+996000000000",
    idempotencyKey: "delayed-hold-retry",
  };
  const first = createHold(request, mockRooms, [], now);

  // A different request performs housekeeping after the first hold expired.
  const later = new Date(now.getTime() + 61 * 60_000);
  createHold(
    {
      roomId: mockRooms[2].id,
      checkIn: "2026-08-20",
      checkOut: "2026-08-22",
      idempotencyKey: "sweep-trigger",
    },
    mockRooms,
    [],
    later
  );

  const replay = createHold(request, mockRooms, [], later);
  assert.equal(replay.id, first.id);
  assert.equal(replay.expiresAt, first.expiresAt);
  assert.equal(replay.guestName, undefined);
  assert.equal(replay.guestPhone, undefined);
  assert.equal(listActiveHolds(later).length, 1);
  resetHoldStoreForTests();
});

test("createHold rejects unknown or inactive rooms explicitly", () => {
  resetHoldStoreForTests();
  assert.throws(
    () =>
      createHold(
        { roomId: "does-not-exist", checkIn: "2026-08-10", checkOut: "2026-08-12" },
        mockRooms,
        []
      ),
    (e: unknown) => {
      assert.ok(e instanceof AvailabilityError);
      assert.equal(e.code, "invalid_room");
      return true;
    }
  );

  const maintenanceRooms: RoomUnit[] = [
    { ...mockRooms[0], status: "maintenance" },
  ];
  assert.throws(
    () =>
      createHold(
        {
          roomId: maintenanceRooms[0].id,
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
        },
        maintenanceRooms,
        []
      ),
    (e: unknown) => {
      assert.ok(e instanceof AvailabilityError);
      assert.equal(e.code, "invalid_room");
      return true;
    }
  );
});

test("filterRooms treats malformed occupancy dates as blocking (fail closed)", () => {
  const roomId = mockRooms[0].id;
  const corrupt: OccupancyRecord = {
    id: "occ_corrupt",
    roomId,
    checkIn: "not-a-date",
    checkOut: "2026-08-05",
    status: "confirmed",
  };

  const items = filterRooms(
    mockRooms,
    { checkIn: "2026-08-01", checkOut: "2026-08-03" },
    [corrupt]
  );
  assert.equal(
    items.length,
    mockRooms.filter((r) => r.status === "active").length - 1
  );
});

test("filterRooms treats inverted occupancy date ranges as blocking (fail closed)", () => {
  const roomId = mockRooms[0].id;
  const inverted: OccupancyRecord = {
    id: "occ_inverted",
    roomId,
    checkIn: "2026-08-05",
    checkOut: "2026-08-01",
    status: "confirmed",
  };

  const items = filterRooms(
    mockRooms,
    { checkIn: "2026-08-01", checkOut: "2026-08-03" },
    [inverted]
  );
  assert.equal(
    items.length,
    mockRooms.filter((r) => r.status === "active").length - 1
  );
});

test("filterRooms rejects occupancy dates JS Date would parse permissively", () => {
  const roomId = mockRooms[0].id;
  const permissive: OccupancyRecord = {
    id: "occ_permissive",
    roomId,
    checkIn: "08/01/2026",
    checkOut: "2026-08-05",
    status: "confirmed",
  };

  const items = filterRooms(
    mockRooms,
    { checkIn: "2026-08-01", checkOut: "2026-08-03" },
    [permissive]
  );
  assert.equal(
    items.length,
    mockRooms.filter((r) => r.status === "active").length - 1
  );
});

test("createHold is idempotent for repeated requests with the same key", () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[0].id;
  const now = new Date("2026-08-01T10:00:00.000Z");

  const first = createHold(
    {
      roomId,
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      idempotencyKey: "retry-key-1",
    },
    mockRooms,
    [],
    now
  );

  const replay = createHold(
    {
      roomId,
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      idempotencyKey: "retry-key-1",
    },
    mockRooms,
    [],
    new Date(now.getTime() + 1000)
  );
  assert.equal(replay.id, first.id);
  assert.equal(listActiveHolds(now).length, 1);

  assert.throws(
    () =>
      createHold(
        {
          roomId,
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          idempotencyKey: "retry-key-1",
        },
        mockRooms,
        [],
        now
      ),
    (e: unknown) => {
      assert.ok(e instanceof AvailabilityError);
      assert.equal(e.code, "idempotency_conflict");
      return true;
    }
  );
  resetHoldStoreForTests();
});

test("createHold normalizes idempotency keys and does not expose identifiers in errors", () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[0].id;
  const first = createHold(
    {
      roomId,
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      idempotencyKey: " retry-key-private ",
    },
    mockRooms
  );
  assert.equal(first.idempotencyKey, "retry-key-private");
  const replay = createHold(
    {
      roomId,
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      idempotencyKey: "retry-key-private",
    },
    mockRooms
  );
  assert.equal(replay.id, first.id);
  assert.throws(
    () =>
      createHold(
        {
          roomId,
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          idempotencyKey: "retry-key-private",
        },
        mockRooms
      ),
    (error: unknown) => {
      assert.ok(error instanceof AvailabilityError);
      assert.doesNotMatch(error.message, /retry-key-private/);
      return true;
    }
  );
  resetHoldStoreForTests();
});

test("createHold stays consistent when invoked concurrently for the same room/dates", async () => {
  resetHoldStoreForTests();
  const roomId = mockRooms[2].id;
  const now = new Date("2026-08-01T10:00:00.000Z");

  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      Promise.resolve().then(() =>
        createHold(
          { roomId, checkIn: "2026-08-20", checkOut: "2026-08-22" },
          mockRooms,
          [],
          now
        )
      )
    )
  );

  const fulfilled = attempts.filter((a) => a.status === "fulfilled");
  const rejected = attempts.filter((a) => a.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, attempts.length - 1);
  for (const attempt of rejected) {
    assert.ok(attempt.status === "rejected");
    assert.ok(attempt.reason instanceof AvailabilityError);
    assert.equal(attempt.reason.code, "hold_conflict");
  }
  assert.equal(listActiveHolds(now).length, 1);
  resetHoldStoreForTests();
});
