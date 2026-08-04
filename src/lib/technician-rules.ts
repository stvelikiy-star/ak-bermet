import type { RoleName } from "@/types/auth";
import type { MaintenanceStatus } from "@/types/operations";
import type { MaintenanceLogType } from "@/types/technician";

export type TechnicianAction =
  | "accept"
  | "start_diagnostics"
  | "record_diagnosis"
  | "start_repair"
  | "record_work"
  | "record_material"
  | "complete"
  | "record_attachment";

const ACTION_STATUSES: Record<TechnicianAction, MaintenanceStatus[]> = {
  accept: ["reported"],
  start_diagnostics: ["acknowledged"],
  record_diagnosis: ["acknowledged", "in_progress", "on_hold"],
  start_repair: ["in_progress"],
  record_work: ["in_progress", "on_hold"],
  record_material: ["in_progress", "on_hold"],
  complete: ["in_progress"],
  record_attachment: ["acknowledged", "in_progress", "on_hold"],
};

export function technicianAuthorization(
  configured: boolean,
  authenticated: boolean,
  active: boolean,
  roles: RoleName[]
): 200 | 401 | 403 | 503 {
  if (!configured) return 503;
  if (!authenticated) return 401;
  if (!active || !roles.includes("technician")) return 403;
  return 200;
}

export function validateTechnicianAction(
  status: MaintenanceStatus,
  action: TechnicianAction
): string | null {
  return ACTION_STATUSES[action].includes(status)
    ? null
    : "Действие недоступно для текущего статуса заявки.";
}

export function validateText(value: unknown, min = 3, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

export interface WorkLogInput {
  logType: MaintenanceLogType;
  description: string | null;
  materialName: string | null;
  quantity: number | null;
  unit: string | null;
}

export function validateWorkLogInput(
  action: TechnicianAction,
  body: Record<string, unknown>
): WorkLogInput | null {
  if (action === "record_diagnosis" || action === "record_work") {
    const description = validateText(body.description);
    if (!description) return null;
    return {
      logType: action === "record_diagnosis" ? "diagnosis" : "work_performed",
      description,
      materialName: null,
      quantity: null,
      unit: null,
    };
  }
  if (action === "start_repair") {
    return {
      logType: "note",
      description: "Repair started",
      materialName: null,
      quantity: null,
      unit: null,
    };
  }
  if (action === "record_material") {
    const materialName = validateText(body.materialName, 2, 200);
    const unit = validateText(body.unit, 1, 50);
    const quantity =
      typeof body.quantity === "number" && Number.isFinite(body.quantity)
        ? body.quantity
        : NaN;
    if (!materialName || !unit || quantity <= 0 || quantity > 99999999) return null;
    return {
      logType: "material_used",
      description: validateText(body.description) ?? null,
      materialName,
      quantity,
      unit,
    };
  }
  return null;
}

export function validateStoragePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (
    path.length < 3 ||
    path.length > 1000 ||
    path.startsWith("/") ||
    path.includes("..") ||
    /^https?:\/\//i.test(path)
  ) {
    return null;
  }
  return path;
}

export function validateMaintenanceCompletionEvidence(input: {
  diagnosis: string | null;
  logTypes: readonly MaintenanceLogType[];
  attachmentPhases: readonly string[];
}): string | null {
  if (!validateText(input.diagnosis)) {
    return "Перед завершением запишите результат диагностики.";
  }
  if (!input.logTypes.includes("work_performed")) {
    return "Перед завершением запишите выполненную работу.";
  }
  if (!input.attachmentPhases.includes("diagnostic")) {
    return "Перед завершением добавьте фотографию до ремонта (диагностика).";
  }
  if (!input.attachmentPhases.includes("result")) {
    return "Перед завершением добавьте фотографию результата ремонта.";
  }
  return null;
}
