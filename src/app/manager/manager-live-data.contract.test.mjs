import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const files = [
  "./page.tsx",
  "./rooms/page.tsx",
  "./payments/page.tsx",
  "./reports/page.tsx",
];

const contents = Object.fromEntries(
  files.map((path) => [path, fs.readFileSync(new URL(path, import.meta.url), "utf8")]),
);
const availabilityPage = fs.readFileSync(new URL("./availability/page.tsx", import.meta.url), "utf8");
const chessboardShared = fs.readFileSync(new URL("../../lib/booking-chessboard.ts", import.meta.url), "utf8");
const chessboardLoader = fs.readFileSync(new URL("../../lib/booking-chessboard-server.ts", import.meta.url), "utf8");

test("manager operational pages do not import demo manager-mock data", () => {
  for (const [path, source] of Object.entries(contents)) {
    assert.doesNotMatch(source, /manager-mock/, `${path} must not depend on manager-mock`);
    assert.match(source, /createSupabaseServerClient/, `${path} must read through authenticated Supabase`);
    assert.match(source, /getCurrentStaff/, `${path} must preserve staff role gating`);
  }
});

test("manager overview uses real operational enum values", () => {
  const source = contents["./page.tsx"];
  assert.match(source, /\(done,cancelled\)/);
  assert.doesNotMatch(source, /\(completed,cancelled\).*cleaning/i);
  assert.match(source, /\(completed,closed,cancelled\)/);
});

test("room registry is backed by authoritative room_units", () => {
  const source = contents["./rooms/page.tsx"];
  assert.match(source, /\.from\("room_units"\)/);
  assert.match(source, /official_beds/);
  assert.match(source, /max_capacity/);
  assert.match(source, /operational_status/);
});

test("payments page uses the real manual ledger and never pretends to process money", () => {
  const source = contents["./payments/page.tsx"];
  assert.match(source, /\.from\("bookings"\)/);
  assert.match(source, /\.from\("booking_payments"\)/);
  assert.match(source, /ManualPaymentForm/);
  assert.match(source, /Фактически зафиксировано/);
  assert.match(source, /Интернет-эквайринга и автоматического списания нет/);
  assert.match(source, /не банковская/i);
});

test("analytics is computed from CRM bookings payments rooms and occupancy in Supabase", () => {
  const source = contents["./reports/page.tsx"];
  assert.match(source, /\.from\("leads"\)/);
  assert.match(source, /\.from\("bookings"\)/);
  assert.match(source, /\.from\("booking_payments"\)/);
  assert.match(source, /\.from\("room_units"\)/);
  assert.match(source, /\.from\("occupancy_periods"\)/);
  assert.match(source, /Конверсия в бронь/);
  assert.match(source, /Заезды сегодня/);
  assert.match(source, /Готово к продаже/);
  assert.match(source, /не банковская/i);
});

test("booking chessboard reads authoritative Supabase inventory without mock fallback", () => {
  assert.match(availabilityPage, /loadBookingChessboard/);
  assert.match(availabilityPage, /booking-chessboard-server/);
  assert.doesNotMatch(availabilityPage, /manager-mock|mockRooms|mockOccupancy/);
  assert.match(chessboardLoader, /\.from\("room_units"\)/);
  assert.match(chessboardLoader, /\.from\("occupancy_periods"\)/);
  assert.match(chessboardLoader, /\.overlaps\("period", `\[\$\{from\},\$\{to\}\)`\)/);
  assert.match(chessboardLoader, /getCurrentStaff/);
  assert.match(chessboardLoader, /BookingChessboardError\("READ_FAILED"\)/);
  assert.doesNotMatch(chessboardLoader, /manager-mock|mockRooms|mockOccupancy/);
  assert.doesNotMatch(chessboardShared, /getCurrentStaff|server-client|next\/headers/);
});
