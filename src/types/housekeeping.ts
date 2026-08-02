import type {
  CleaningTaskStatus,
  RoomOperationalStatus,
} from "@/types/operations";

export interface HousekeepingTask {
  id: string;
  taskNumber: string;
  status: CleaningTaskStatus;
  roomNumber: string;
  buildingName: string | null;
  roomOperationalStatus: RoomOperationalStatus | null;
  dueBy: string | null;
  requiresInspection: boolean;
  reportedProblem: string | null;
  createdAt: string;
  attachments: HousekeepingAttachment[];
}

export interface HousekeepingAttachment {
  id: string;
  phase: "before" | "after";
  storagePath: string;
  createdAt: string;
}
