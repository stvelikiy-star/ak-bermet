import test from "node:test";
import assert from "node:assert/strict";
import {
  canRoomBecomeReady,
  resultingRoomStatus,
  validateInspectionAction,
} from "./inspection-rules";

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
      alreadyInspected: false,
      isCurrentTask: true,
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
      alreadyInspected: false,
      isCurrentTask: true,
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
      alreadyInspected: false,
      isCurrentTask: true,
    }) ?? "",
    /блокирующая/
  );
});

test("blocking action supports only inspectable completed source tasks", () => {
  assert.equal(
    validateInspectionAction({
      source: "cleaning",
      action: "mark_blocking_problem",
      roomStatus: "inspection_required",
      cleaningStatus: "done",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: true,
    }),
    null
  );
  assert.equal(
    validateInspectionAction({
      source: "maintenance",
      action: "mark_blocking_problem",
      roomStatus: "inspection_required",
      maintenanceStatus: "completed",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: true,
    }),
    null
  );
  assert.match(
    validateInspectionAction({
      source: "maintenance",
      action: "mark_blocking_problem",
      roomStatus: "inspection_required",
      maintenanceStatus: "in_progress",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: true,
    }) ?? "",
    /завершённого ремонта/
  );
  assert.match(
    validateInspectionAction({
      source: "cleaning",
      action: "mark_blocking_problem",
      roomStatus: "ready",
      cleaningStatus: "done",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: true,
    }) ?? "",
    /не ожидает проверки/
  );
});

test("stale or already-resolved tasks are rejected before any action-specific rule", () => {
  assert.match(
    validateInspectionAction({
      source: "cleaning",
      action: "approve",
      roomStatus: "inspection_required",
      cleaningStatus: "done",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: true,
      isCurrentTask: true,
    }) ?? "",
    /уже проверена/
  );
  assert.match(
    validateInspectionAction({
      source: "cleaning",
      action: "approve",
      roomStatus: "inspection_required",
      cleaningStatus: "done",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: false,
    }) ?? "",
    /устарела/
  );
  assert.match(
    validateInspectionAction({
      source: "maintenance",
      action: "mark_blocking_problem",
      roomStatus: "inspection_required",
      maintenanceStatus: "completed",
      hasActiveBlockingMaintenance: false,
      alreadyInspected: false,
      isCurrentTask: false,
    }) ?? "",
    /устарела/
  );
});
