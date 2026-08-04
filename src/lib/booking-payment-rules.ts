import type { BookingStatus } from "@/types/availability";
import type { PaymentStatus } from "@/types/manager";

export const PREPAYMENT_PERCENT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RefundTier = "full" | "half_prepayment" | "one_night_charge" | "none";

export interface PaymentState {
  total: number;
  paid: number;
  status: PaymentStatus;
  processedCallbackIds: readonly string[];
  /** Payloads retained so a reused provider event ID cannot hide a different payment. */
  processedCallbacks?: Readonly<Record<string, string>>;
}

export interface PaymentCallback {
  id: string;
  outcome: "succeeded" | "failed";
  amount: number;
}

export interface PaymentCallbackResult {
  state: PaymentState;
  applied: boolean;
}

const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  pre_hold: ["waiting_prepayment", "cancelled"],
  waiting_prepayment: ["paid", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checking_out"],
  checking_out: [],
  no_show: [],
  cancelled: [],
};

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative amount`);
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Calculates the standard booking prepayment without using binary-float fractions. */
export function calculatePrepayment(total: number): number {
  assertMoney(total, "total");
  return roundMoney((total * PREPAYMENT_PERCENT) / 100);
}

/**
 * Applies a provider callback once. Replays return the original state reference;
 * callbacks cannot regress a payment or make the paid amount exceed total.
 */
export function applyPaymentCallback(
  state: PaymentState,
  callback: PaymentCallback
): PaymentCallbackResult {
  assertMoney(state.total, "total");
  assertMoney(state.paid, "paid");
  assertMoney(callback.amount, "callback.amount");
  const callbackId = callback.id.trim();
  if (!callbackId) throw new TypeError("callback.id is required");
  const callbackFingerprint = `${callback.outcome}:${roundMoney(callback.amount)}`;

  const matchingStoredIds = state.processedCallbackIds.filter(
    (storedId) => storedId.trim() === callbackId
  );
  if (matchingStoredIds.length > 0) {
    const fingerprints = matchingStoredIds
      .map(
        (storedId) =>
          state.processedCallbacks?.[storedId] ??
          state.processedCallbacks?.[callbackId]
      )
      .filter((value): value is string => value !== undefined);
    const originalFingerprint = fingerprints[0];
    if (!originalFingerprint) {
      throw new Error(
        "Payment callback replay cannot be verified because its payload metadata is unavailable"
      );
    }
    if (
      originalFingerprint !== callbackFingerprint ||
      fingerprints.some((fingerprint) => fingerprint !== originalFingerprint)
    ) {
      throw new Error("A payment callback ID was reused with a different payload");
    }
    return { state, applied: false };
  }

  if (state.status === "refunded") {
    throw new Error("A refunded payment cannot accept payment callbacks");
  }

  const processedCallbackIds = [...state.processedCallbackIds, callbackId];
  const processedCallbacks = {
    ...state.processedCallbacks,
    [callbackId]: callbackFingerprint,
  };
  if (callback.outcome === "failed") {
    return {
      state: {
        ...state,
        status: state.paid > 0 ? state.status : "failed",
        processedCallbackIds,
        processedCallbacks,
      },
      applied: true,
    };
  }

  if (callback.amount === 0) {
    throw new RangeError("A successful callback amount must be greater than zero");
  }
  if (state.paid >= state.total) {
    throw new Error("A fully paid booking cannot accept another successful payment");
  }

  const paid = roundMoney(state.paid + callback.amount);
  if (paid > state.total) throw new RangeError("Payment exceeds booking total");

  return {
    state: {
      ...state,
      paid,
      status: paid >= calculatePrepayment(state.total) ? "paid" : "partial",
      processedCallbackIds,
      processedCallbacks,
    },
    applied: true,
  };
}

/** Idempotent booking transition with an explicit allowlist. */
export function transitionBooking(
  current: BookingStatus,
  next: BookingStatus
): BookingStatus {
  if (current === next) return current;
  if (!BOOKING_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid booking transition: ${current} -> ${next}`);
  }
  return next;
}

export function daysBeforeArrival(cancelledAt: Date, arrivalAt: Date): number {
  const cancelled = cancelledAt.getTime();
  const arrival = arrivalAt.getTime();
  if (!Number.isFinite(cancelled) || !Number.isFinite(arrival)) {
    throw new TypeError("Cancellation and arrival dates must be valid");
  }
  return Math.floor((arrival - cancelled) / DAY_MS);
}

/** Mirrors the approved refund tiers in data/legal.ts. */
export function refundTierForCancellation(daysBefore: number): RefundTier {
  if (!Number.isFinite(daysBefore)) throw new TypeError("daysBefore must be finite");
  if (daysBefore >= 14) return "full";
  if (daysBefore >= 7) return "half_prepayment";
  return "one_night_charge";
}

export function calculateRefund(input: {
  total: number;
  paid: number;
  nightlyRate: number;
  daysBefore: number;
  noShow?: boolean;
}): { amount: number; tier: RefundTier } {
  assertMoney(input.total, "total");
  assertMoney(input.paid, "paid");
  assertMoney(input.nightlyRate, "nightlyRate");
  if (input.paid > input.total) throw new RangeError("paid cannot exceed total");
  if (input.noShow) return { amount: 0, tier: "none" };

  const tier = refundTierForCancellation(input.daysBefore);
  if (tier === "full") return { amount: roundMoney(input.paid), tier };
  if (tier === "half_prepayment") {
    const retained = calculatePrepayment(input.total) / 2;
    return { amount: roundMoney(Math.max(0, input.paid - retained)), tier };
  }
  return { amount: roundMoney(Math.max(0, input.paid - input.nightlyRate)), tier };
}
