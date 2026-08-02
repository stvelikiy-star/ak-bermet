import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPaymentCallback,
  calculatePrepayment,
  calculateRefund,
  refundTierForCancellation,
  transitionBooking,
  type PaymentState,
} from "./booking-payment-rules.ts";

test("prepayment is exactly 20 percent and rounded as money", () => {
  assert.equal(calculatePrepayment(123.45), 24.69);
});

test("repeated successful callback is idempotent", () => {
  const initial: PaymentState = {
    total: 1000,
    paid: 0,
    status: "waiting",
    processedCallbackIds: [],
  };
  const callback = { id: "provider-event-1", outcome: "succeeded" as const, amount: 200 };
  const first = applyPaymentCallback(initial, callback);
  const replay = applyPaymentCallback(first.state, callback);
  assert.equal(first.state.paid, 200);
  assert.equal(first.state.status, "paid");
  assert.equal(replay.applied, false);
  assert.strictEqual(replay.state, first.state);
});

test("callback IDs are normalized and conflicting replays are rejected", () => {
  const initial: PaymentState = {
    total: 1000,
    paid: 0,
    status: "waiting",
    processedCallbackIds: [],
  };
  const first = applyPaymentCallback(initial, {
    id: " provider-event-2 ",
    outcome: "succeeded",
    amount: 200,
  });
  const replay = applyPaymentCallback(first.state, {
    id: "provider-event-2",
    outcome: "succeeded",
    amount: 200,
  });
  assert.equal(replay.applied, false);
  assert.throws(
    () =>
      applyPaymentCallback(first.state, {
        id: "provider-event-2",
        outcome: "succeeded",
        amount: 300,
      }),
    /different payload/
  );
});

test("legacy callback replay without a fingerprint fails closed", () => {
  const legacyState: PaymentState = {
    total: 1000,
    paid: 200,
    status: "paid",
    processedCallbackIds: ["legacy-event"],
  };

  assert.throws(
    () =>
      applyPaymentCallback(legacyState, {
        id: "legacy-event",
        outcome: "succeeded",
        amount: 300,
      }),
    /payload metadata is unavailable/
  );
});

test("legacy callback IDs with whitespace are normalized before replay lookup", () => {
  const legacyState: PaymentState = {
    total: 1000,
    paid: 200,
    status: "paid",
    processedCallbackIds: [" legacy-event-with-spaces "],
    processedCallbacks: {
      " legacy-event-with-spaces ": "succeeded:200",
    },
  };

  const replay = applyPaymentCallback(legacyState, {
    id: "legacy-event-with-spaces",
    outcome: "succeeded",
    amount: 200,
  });
  assert.equal(replay.applied, false);
  assert.strictEqual(replay.state, legacyState);
  assert.throws(
    () =>
      applyPaymentCallback(legacyState, {
        id: "legacy-event-with-spaces",
        outcome: "succeeded",
        amount: 300,
      }),
    /different payload/
  );
});

test("payment callbacks cannot overpay or revive a refund", () => {
  const state: PaymentState = {
    total: 1000,
    paid: 900,
    status: "partial",
    processedCallbackIds: [],
  };
  assert.throws(
    () => applyPaymentCallback(state, { id: "overpay", outcome: "succeeded", amount: 101 }),
    /exceeds/
  );
  assert.throws(
    () => applyPaymentCallback({ ...state, status: "refunded" }, { id: "late", outcome: "succeeded", amount: 100 }),
    /refunded/
  );
});

test("booking transitions are idempotent and reject invalid reversals", () => {
  assert.equal(transitionBooking("confirmed", "confirmed"), "confirmed");
  assert.equal(transitionBooking("confirmed", "no_show"), "no_show");
  assert.throws(() => transitionBooking("cancelled", "confirmed"), /Invalid/);
  assert.throws(() => transitionBooking("no_show", "checked_in"), /Invalid/);
});

test("refund boundaries follow approved 14-day and 7-day tiers", () => {
  assert.equal(refundTierForCancellation(14), "full");
  assert.equal(refundTierForCancellation(7), "half_prepayment");
  assert.equal(refundTierForCancellation(6), "one_night_charge");
  assert.deepEqual(calculateRefund({ total: 1000, paid: 400, nightlyRate: 300, daysBefore: 6 }), {
    amount: 100,
    tier: "one_night_charge",
  });
  assert.deepEqual(calculateRefund({ total: 1000, paid: 400, nightlyRate: 300, daysBefore: 20, noShow: true }), {
    amount: 0,
    tier: "none",
  });
});

test("7-14 day cancellation refunds excess payment plus half the prepayment", () => {
  assert.deepEqual(calculateRefund({ total: 1000, paid: 1000, nightlyRate: 300, daysBefore: 7 }), {
    amount: 900,
    tier: "half_prepayment",
  });
});
