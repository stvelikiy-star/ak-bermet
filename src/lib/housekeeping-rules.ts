import type { CleaningTaskStatus } from "../types/operations";

export type HousekeepingAction = "accept" | "start" | "complete" | "report_problem";
export type HousekeepingPriority = "overdue" | "high" | "normal" | "low";

const ACTION_STATUS: Record<HousekeepingAction, readonly CleaningTaskStatus[]> = {
  accept: ["pending"],
  start: ["accepted"],
  complete: ["in_progress"],
  report_problem: ["pending", "accepted", "in_progress"],
};

export function canPerformHousekeepingAction(
  status: CleaningTaskStatus,
  action: HousekeepingAction
): boolean {
  return ACTION_STATUS[action].includes(status);
}

export function validateHousekeepingAction(
  status: CleaningTaskStatus,
  action: HousekeepingAction
): string | null {
  if (canPerformHousekeepingAction(status, action)) return null;
  return `Действие «${action}» недоступно для статуса «${status}».`;
}

// У cleaning_tasks нет поля priority. В интерфейсе приоритет честно
// вычисляется только из due_by, не выдавая производное значение за колонку БД.
export function getHousekeepingPriority(
  dueBy: string | null,
  nowMs: number = Date.now()
): HousekeepingPriority {
  if (!dueBy) return "low";
  const dueMs = Date.parse(dueBy);
  if (!Number.isFinite(dueMs)) return "low";
  const remaining = dueMs - nowMs;
  if (remaining < 0) return "overdue";
  if (remaining <= 2 * 60 * 60 * 1000) return "high";
  return "normal";
}

export function isValidProblemNote(note: string): boolean {
  return note.trim().length >= 3 && note.trim().length <= 1000;
}
