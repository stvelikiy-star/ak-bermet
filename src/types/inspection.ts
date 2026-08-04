import type {
  CleaningTaskStatus,
  InspectionResult,
  InspectionTriggerReason,
  MaintenanceStatus,
  RoomOperationalStatus,
} from "./operations";

export type InspectionSource = "cleaning" | "maintenance";

export interface InspectionAttachment {
  id: string;
  phase: "before" | "after" | "diagnostic" | "result" | "other";
  storagePath: string;
  createdAt: string;
}

export interface InspectionHistoryItem {
  id: string;
  result: InspectionResult;
  notes: string | null;
  createdAt: string;
  triggerReason: InspectionTriggerReason;
  inspectorName: string | null;
  attachments: InspectionAttachment[];
}

export interface InspectionQueueItem {
  id: string;
  source: InspectionSource;
  roomId: string;
  roomNumber: string;
  buildingName: string | null;
  roomStatus: RoomOperationalStatus;
  taskNumber: string;
  taskStatus: CleaningTaskStatus | MaintenanceStatus;
  resultSummary: string | null;
  reportedProblem: string | null;
  requiresInspection: boolean;
  activeBlockingMaintenance: boolean;
  attachments: InspectionAttachment[];
  inspections: InspectionHistoryItem[];
  createdAt: string;
}

export interface InspectionQueueResponse {
  items: InspectionQueueItem[];
}
