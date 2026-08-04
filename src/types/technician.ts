import type {
  MaintenancePriority,
  MaintenanceStatus,
} from "@/types/operations";

export type MaintenanceLogType =
  | "diagnosis"
  | "work_performed"
  | "material_used"
  | "note";

export type MaintenanceAttachmentPhase =
  | "before"
  | "after"
  | "diagnostic"
  | "result"
  | "other";

export interface MaintenanceAttachment {
  id: string;
  phase: MaintenanceAttachmentPhase;
  storagePath: string;
  createdAt: string;
}

export interface MaintenanceWorkLog {
  id: string;
  logType: MaintenanceLogType;
  description: string | null;
  materialName: string | null;
  quantity: number | null;
  unit: string | null;
  loggedAt: string;
}

export interface TechnicianTask {
  id: string;
  requestNumber: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  description: string;
  diagnosis: string | null;
  blocksRoom: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  roomNumber: string;
  buildingName: string | null;
  attachments: MaintenanceAttachment[];
  workLogs: MaintenanceWorkLog[];
}
