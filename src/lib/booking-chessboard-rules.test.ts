import assert from "node:assert/strict";
import test from "node:test";

import {
  chessboardStateForDate,
  daysBetween,
  isIsoDate,
  parseDateRange,
  periodOverlapsDate,
  type ChessboardPeriod,
  type ChessboardRoom,
} from "./booking-chessboard-rules";

const room: ChessboardRoom = {
  id: "room-1",
  building: "Корпус 1",
  roomNumber: "101",
  floor: 1,
  category: "Стандарт",
  sellableStatus: "active",
  operationalStatus: "ready",
};

function period(
  state: ChessboardPeriod["state"],
  start = "2026-08-26",
  end = "2026-08-28",
): ChessboardPeriod {
  return {
    id: `period-${state}`,
    roomId: room.id,
    start,
    end,
    state,
    label: state,
    sourceId: null,
  };
}

test("strict ISO calendar validation rejects normalized impossible dates", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("26-08-01"), false);
  assert.ok(Number.isNaN(daysBetween("2026-02-30", "2026-03-02")));
});

test("date ranges preserve PostgreSQL half-open boundaries", () => {
  assert.deepEqual(parseDateRange("[2026-08-26,2026-08-28)"), {
    start: "2026-08-26",
    end: "2026-08-28",
  });
  assert.equal(parseDateRange("[2026-02-30,2026-03-02)"), null);
  assert.equal(periodOverlapsDate(period("booking"), "2026-08-26"), true);
  assert.equal(periodOverlapsDate(period("booking"), "2026-08-27"), true);
  assert.equal(periodOverlapsDate(period("booking"), "2026-08-28"), false);
});

test("free, hold and booking cells map to the actual active period", () => {
  assert.equal(chessboardStateForDate(room, [], "2026-08-26").state, "free");
  assert.equal(
    chessboardStateForDate(room, [period("hold")], "2026-08-26").state,
    "hold",
  );
  assert.equal(
    chessboardStateForDate(room, [period("booking")], "2026-08-26").state,
    "booking",
  );
});

test("technical and stop-sale state overrides occupancy on every visible day", () => {
  const maintenanceRoom = {
    ...room,
    operationalStatus: "maintenance_in_progress",
  };
  const stopSaleRoom = { ...room, sellableStatus: "do_not_sell" };

  assert.equal(
    chessboardStateForDate(
      maintenanceRoom,
      [period("booking")],
      "2026-08-26",
    ).state,
    "blocked",
  );
  assert.equal(
    chessboardStateForDate(stopSaleRoom, [period("hold")], "2026-08-26").state,
    "blocked",
  );
});

test("periods belonging to another room never occupy this room", () => {
  const foreign = { ...period("booking"), roomId: "room-2" };
  assert.equal(
    chessboardStateForDate(room, [foreign], "2026-08-26").state,
    "free",
  );
});
