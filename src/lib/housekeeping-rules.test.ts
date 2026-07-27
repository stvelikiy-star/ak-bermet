import test from "node:test";
import assert from "node:assert/strict";
import {
  canPerformHousekeepingAction,
  getHousekeepingPriority,
  isValidProblemNote,
  validateHousekeepingAction,
} from "./housekeeping-rules.ts";

test("housekeeping transitions allow only the prepared RPC state graph", () => {
  assert.equal(canPerformHousekeepingAction("pending", "accept"), true);
  assert.equal(canPerformHousekeepingAction("accepted", "start"), true);
  assert.equal(canPerformHousekeepingAction("in_progress", "complete"), true);

  assert.equal(canPerformHousekeepingAction("accepted", "accept"), false);
  assert.equal(canPerformHousekeepingAction("pending", "start"), false);
  assert.equal(canPerformHousekeepingAction("done", "complete"), false);
  assert.match(
    validateHousekeepingAction("problem_reported", "start") ?? "",
    /недоступно/
  );
});

test("problem reporting is limited to active, owned-workflow statuses", () => {
  assert.equal(canPerformHousekeepingAction("pending", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("accepted", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("in_progress", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("problem_reported", "report_problem"), false);
  assert.equal(canPerformHousekeepingAction("done", "report_problem"), false);
  assert.equal(canPerformHousekeepingAction("cancelled", "report_problem"), false);
});

test("due-date priority is deterministic for a supplied clock", () => {
  const now = Date.parse("2026-07-27T06:00:00.000Z");
  assert.equal(getHousekeepingPriority(null, now), "low");
  assert.equal(
    getHousekeepingPriority("2026-07-27T05:59:59.000Z", now),
    "overdue"
  );
  assert.equal(
    getHousekeepingPriority("2026-07-27T07:30:00.000Z", now),
    "high"
  );
  assert.equal(
    getHousekeepingPriority("2026-07-28T06:00:00.000Z", now),
    "normal"
  );
});

test("problem notes reject blank, too-short, and oversized values", () => {
  assert.equal(isValidProblemNote("  "), false);
  assert.equal(isValidProblemNote("ab"), false);
  assert.equal(isValidProblemNote("Течёт кран"), true);
  assert.equal(isValidProblemNote("x".repeat(1001)), false);
});
