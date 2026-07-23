import type {
  CleaningTaskStatus,
  InspectionResult,
  InspectionTriggerReason,
  MaintenancePriority,
  MaintenanceStatus,
  OperationsRoomRef,
  RoomOperationalStatus,
} from "@/types/operations";

// Русские подписи для Operational CRM (Stage 10, только чтение).
// Значения строго соответствуют enum'ам, развёрнутым в Supabase
// (supabase/migrations/20260722*).

export const ROOM_STATUS_ORDER: RoomOperationalStatus[] = [
  "checkout_pending",
  "cleaning_required",
  "cleaning_in_progress",
  "inspection_required",
  "ready",
  "maintenance_required",
  "maintenance_in_progress",
  "blocked",
];

// Карточки сводки показывают именно этот подмножество и порядок статусов.
export const SUMMARY_CARD_STATUSES: RoomOperationalStatus[] = [
  "ready",
  "cleaning_required",
  "cleaning_in_progress",
  "inspection_required",
  "maintenance_required",
  "maintenance_in_progress",
  "blocked",
];

export const ROOM_STATUS_LABELS: Record<RoomOperationalStatus, string> = {
  checkout_pending: "Ожидает выезда",
  cleaning_required: "Требуется уборка",
  cleaning_in_progress: "Уборка в процессе",
  inspection_required: "Требуется проверка",
  ready: "Готов",
  maintenance_required: "Требуется ремонт",
  maintenance_in_progress: "Ремонт в процессе",
  blocked: "Заблокирован",
};

export const ROOM_STATUS_STYLES: Record<RoomOperationalStatus, string> = {
  checkout_pending: "bg-gray-100 text-gray-600 ring-gray-200",
  cleaning_required: "bg-amber-100 text-amber-700 ring-amber-200",
  cleaning_in_progress: "bg-orange-100 text-orange-700 ring-orange-200",
  inspection_required: "bg-purple-100 text-purple-700 ring-purple-200",
  ready: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  maintenance_required: "bg-red-100 text-red-700 ring-red-200",
  maintenance_in_progress: "bg-orange-100 text-orange-700 ring-orange-200",
  blocked: "bg-gray-200 text-gray-700 ring-gray-300",
};

export const CLEANING_TASK_STATUS_ORDER: CleaningTaskStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "problem_reported",
  "done",
  "cancelled",
];

export const CLEANING_TASK_STATUS_LABELS: Record<CleaningTaskStatus, string> = {
  pending: "Ожидает",
  accepted: "Принята",
  in_progress: "В процессе",
  problem_reported: "Проблема",
  done: "Готово",
  cancelled: "Отменена",
};

export const MAINTENANCE_STATUS_ORDER: MaintenanceStatus[] = [
  "reported",
  "acknowledged",
  "in_progress",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  reported: "Заявлено",
  acknowledged: "Принято",
  in_progress: "В процессе",
  on_hold: "Ожидает (запчасти/доступ)",
  completed: "Выполнено",
  closed: "Закрыто",
  cancelled: "Отменено",
};

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  passed: "Пройдена",
  failed: "Не пройдена",
};

export const INSPECTION_TRIGGER_LABELS: Record<InspectionTriggerReason, string> = {
  post_cleaning: "После уборки",
  post_maintenance: "После ремонта",
  manual: "Внеплановая",
};

// Сводка по номерам: сколько штук и в каком операционном статусе.
// buildingId=null означает "по всем корпусам".
export function summarizeRooms(
  rooms: OperationsRoomRef[],
  buildingId: string | null
): { total: number; byStatus: Record<RoomOperationalStatus, number> } {
  const scoped = buildingId
    ? rooms.filter((r) => r.buildingId === buildingId)
    : rooms;
  const byStatus = Object.fromEntries(
    ROOM_STATUS_ORDER.map((s) => [s, 0])
  ) as Record<RoomOperationalStatus, number>;
  for (const room of scoped) {
    if (room.operationalStatus) byStatus[room.operationalStatus] += 1;
  }
  return { total: scoped.length, byStatus };
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
