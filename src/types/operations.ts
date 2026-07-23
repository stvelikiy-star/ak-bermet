// Типы Operational CRM (Stage 10) — только для чтения.
// Отражают схему, развёрнутую в Supabase-проекте ak-bermet-dev
// (supabase/migrations/20260722*).

export type RoomOperationalStatus =
  | "checkout_pending"
  | "cleaning_required"
  | "cleaning_in_progress"
  | "inspection_required"
  | "ready"
  | "maintenance_required"
  | "maintenance_in_progress"
  | "blocked";

export type CleaningTaskStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "problem_reported"
  | "done"
  | "cancelled";

export type MaintenancePriority = "low" | "normal" | "high" | "urgent";

export type MaintenanceStatus =
  | "reported"
  | "acknowledged"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "closed"
  | "cancelled";

export type InspectionResult = "passed" | "failed";

export type InspectionTriggerReason =
  | "post_cleaning"
  | "post_maintenance"
  | "manual";

export interface BuildingOption {
  id: string;
  name: string;
}

export interface AssigneeOption {
  id: string;
  fullName: string;
}

export interface RoomStatusSummary {
  total: number;
  byStatus: Record<RoomOperationalStatus, number>;
}

export interface OperationsRoomRef {
  id: string;
  roomNumber: string;
  buildingId: string | null;
  buildingName: string | null;
  operationalStatus: RoomOperationalStatus | null;
}

export interface CleaningTaskRow {
  id: string;
  taskNumber: string;
  status: CleaningTaskStatus;
  requiresInspection: boolean;
  reportedProblem: string | null;
  dueBy: string | null;
  createdAt: string;
  room: OperationsRoomRef | null;
  assignee: AssigneeOption | null;
}

export interface MaintenanceRequestRow {
  id: string;
  requestNumber: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  description: string;
  blocksRoom: boolean;
  createdAt: string;
  room: OperationsRoomRef | null;
  assignee: AssigneeOption | null;
}

export interface RoomInspectionRow {
  id: string;
  triggerReason: InspectionTriggerReason;
  result: InspectionResult;
  notes: string | null;
  createdAt: string;
  room: OperationsRoomRef | null;
  inspector: AssigneeOption | null;
}

export interface OperationalNotificationRow {
  id: string;
  notificationType: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  recipient: AssigneeOption | null;
}

export interface OperationsData {
  rooms: OperationsRoomRef[];
  buildings: BuildingOption[];
  assignees: AssigneeOption[];
  cleaningTasks: CleaningTaskRow[];
  maintenanceRequests: MaintenanceRequestRow[];
  roomInspections: RoomInspectionRow[];
  notifications: OperationalNotificationRow[];
}
