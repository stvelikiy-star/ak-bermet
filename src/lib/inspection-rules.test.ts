import test from "node:test";
import assert from "node:assert/strict";
import {
  canRoomBecomeReady,
  resultingRoomStatus,
  validateInspectionAction,
} from "./inspection-rules.ts";

test("ready requires completed cleaning, required approval, and no blocking issue", () => {
  assert.equal(
    canRoomBecomeReady({
      cleaningStatus: "done",
      inspectionRequired: true,
      latestInspectionResult: "passed",
      hasActiveBlockingMaintenance: false,
    }),
    true
  );
  assert.equal(
    canRoomBecomeReady({
      cleaningStatus: "in_progress",
      inspectionRequired: true,
      latestInspectionResult: "passed",
      hasActiveBlockingMaintenance: false,
    }),
    false
  );
  assert.equal(
    canRoomBecomeReady({
      cleaningStatus: "done",
      inspectionRequired: true,
      latestInspectionResult: "failed",
      hasActiveBlockingMaintenance: false,
    }),
    false
  );
  assert.equal(
    canRoomBecomeReady({
      cleaningStatus: "done",
      inspectionRequired: true,
      latestInspectionResult: "passed",
      hasActiveBlockingMaintenance: true,
    }),
    false
  );
});

test("inspection rejection preserves the correction workflow status", () => {
  assert.equal(resultingRoomStatus("cleaning", "failed"), "cleaning_required");
  assert.equal(
    resultingRoomStatus("maintenance", "failed"),
    "maintenance_required"
  );
  assert.equal(resultingRoomStatus("cleaning", "passed"), "ready");
});

test("only matching completed sources can be inspected", () => {
  assert.equal(
    validateInspectionAction({
      source: "cleaning",
      action: "return_cleaning",
      roomStatus: "inspection_required",
      cleaningStatus: "done",
      hasActiveBlockingMaintenance: false,
    }),
    null
  );
  assert.match(
    validateInspectionAction({
      source: "cleaning",
      action: "approve",
      roomStatus: "inspection_required",
      cleaningStatus: "in_progress",
      hasActiveBlockingMaintenance: false,
    }) ?? "",
    /не завершена/
  );
  assert.match(
    validateInspectionAction({
      source: "maintenance",
      action: "approve",
      roomStatus: "inspection_required",
      maintenanceStatus: "closed",
      hasActiveBlockingMaintenance: true,
    }) ?? "",
    /блокирующая/
  );
});

test("unsupported blocking mutation is rejected deterministically", () => {
  assert.match(
    validateInspectionAction({
      source: "maintenance",
      action: "mark_blocking_problem",
      roomStatus: "inspection_required",
      maintenanceStatus: "closed",
      hasActiveBlockingMaintenance: false,
    }) ?? "",
    /нет RPC/
  );
});
