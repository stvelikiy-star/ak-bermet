import type {
  CleaningTaskStatus,
  InspectionResult,
  MaintenanceStatus,
  RoomOperationalStatus,
} from "../types/operations";
import type { InspectionSource } from "../types/inspection";

export type InspectionAction =
  | "approve"
  | "return_cleaning"
  | "return_maintenance"
  | "mark_blocking_problem";

export interface ReadinessFacts {
  cleaningStatus: CleaningTaskStatus | null;
  inspectionRequired: boolean;
  latestInspectionResult: InspectionResult | null;
  hasActiveBlockingMaintenance: boolean;
}

export function canRoomBecomeReady(facts: ReadinessFacts): boolean {
  return (
    facts.cleaningStatus === "done" &&
    (!facts.inspectionRequired || facts.latestInspectionResult === "passed") &&
    !facts.hasActiveBlockingMaintenance
  );
}

export function resultingRoomStatus(
  source: InspectionSource,
  result: InspectionResult
): RoomOperationalStatus {
  if (result === "passed") return "ready";
  return source === "cleaning" ? "cleaning_required" : "maintenance_required";
}

export function validateInspectionAction(input: {
  source: InspectionSource;
  action: InspectionAction;
  roomStatus: RoomOperationalStatus;
  cleaningStatus?: CleaningTaskStatus;
  maintenanceStatus?: MaintenanceStatus;
  hasActiveBlockingMaintenance: boolean;
}): string | null {
  if (input.action === "mark_blocking_problem") {
    if (input.roomStatus !== "inspection_required") {
      return "Номер больше не ожидает проверки.";
    }
    if (input.source === "cleaning") {
      return input.cleaningStatus === "done"
        ? null
        : "Блокирующую проблему можно отметить только для завершённой уборки.";
    }
    return input.maintenanceStatus === "completed" ||
      input.maintenanceStatus === "closed"
      ? null
      : "Блокирующую проблему можно отметить только при проверке завершённого ремонта.";
  }
  if (input.roomStatus !== "inspection_required") {
    return "Номер больше не ожидает проверки.";
  }
  if (input.action === "return_cleaning") {
    return input.source === "cleaning" && input.cleaningStatus === "done"
      ? null
      : "Вернуть на уборку можно только завершённую задачу уборки.";
  }
  if (input.action === "return_maintenance") {
    return input.source === "maintenance" &&
      input.maintenanceStatus === "closed"
      ? null
      : "Вернуть на ремонт можно только закрытую техническую заявку.";
  }
  if (input.source === "cleaning" && input.cleaningStatus !== "done") {
    return "Уборка ещё не завершена.";
  }
  if (input.source === "maintenance" && input.maintenanceStatus !== "closed") {
    return "Техническая заявка ещё не закрыта.";
  }
  if (input.hasActiveBlockingMaintenance) {
    return "Номер нельзя одобрить: есть активная блокирующая техническая заявка.";
  }
  return null;
}

export function inspectionResultForAction(
  action: InspectionAction
): InspectionResult | null {
  if (action === "approve") return "passed";
  if (action === "return_cleaning" || action === "return_maintenance") {
    return "failed";
  }
  return null;
}

export function normalizeInspectionNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length >= 1 && note.length <= 2000 ? note : null;
}
