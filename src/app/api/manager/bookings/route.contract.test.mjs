import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const form = fs.readFileSync(
  new URL("../../../../components/manager/ManualBookingForm.tsx", import.meta.url),
  "utf8",
);

test("manual booking API is role-gated and uses the atomic database RPC", () => {
  assert.match(route, /getCurrentStaff/);
  assert.match(route, /owner/);
  assert.match(route, /administrator/);
  assert.match(route, /manager/);
  assert.match(route, /supabase\.rpc\("fn_create_manual_booking"/);
  assert.doesNotMatch(route, /service[_-]?role/i);
});

test("manual booking API uses strict calendar validation", () => {
  assert.match(
    route,
    /import \{ isIsoDate \} from "@\/lib\/booking-chessboard-rules"/,
  );
  assert.match(route, /!isIsoDate\(checkIn\) \|\| !isIsoDate\(checkOut\)/);
  assert.match(route, /checkOut <= checkIn/);
});

test("manual booking request and response expose no payment fiction", () => {
  assert.match(route, /p_total_amount_kgs: payload\.totalAmountKgs/);
  assert.doesNotMatch(route, /paid_amount|payment_status|payment_reference/);
  assert.match(form, /Предоплата 20%/);
  assert.match(form, /numericTotal \* 20/);
});

test("manual booking maps overlap and authorization failures safely", () => {
  assert.match(route, /23P01/);
  assert.match(route, /ROOM_UNAVAILABLE/);
  assert.match(route, /42501/);
  assert.match(route, /ACCESS_DENIED/);
  assert.doesNotMatch(route, /error\.message.*NextResponse|message: error\.message/);
});
