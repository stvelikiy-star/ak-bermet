import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { validateCleaningPhotoFile } from "@/lib/housekeeping-rules";
import { validateUploadedCleaningPhotoBytes } from "@/lib/housekeeping-photo-validation.server";
import {
  validateStoragePath,
  validateMaintenanceCompletionEvidence,
  validateTechnicianAction,
  validateWorkLogInput,
  type TechnicianAction,
} from "@/lib/technician-rules";
import type { MaintenanceStatus } from "@/types/operations";
import type {
  MaintenanceAttachment,
  MaintenanceAttachmentPhase,
  MaintenanceLogType,
  MaintenanceWorkLog,
  TechnicianTask,
} from "@/types/technician";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RawTask {
  id: string;
  request_number: string;
  status: MaintenanceStatus;
  priority: TechnicianTask["priority"];
  description: string;
  diagnosis: string | null;
  blocks_room: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  room_units:
    | { room_number: string; buildings: { name: string | null } | { name: string | null }[] | null }
    | { room_number: string; buildings: { name: string | null } | { name: string | null }[] | null }[]
    | null;
  task_attachments: {
    id: string;
    phase: MaintenanceAttachmentPhase;
    storage_path: string;
    created_at: string;
  }[] | null;
  maintenance_work_logs: {
    id: string;
    log_type: MaintenanceLogType;
    description: string | null;
    material_name: string | null;
    quantity: number | null;
    unit: string | null;
    logged_at: string;
  }[] | null;
}

const ACTIONS = new Set<TechnicianAction>([
  "accept",
  "start_diagnostics",
  "record_diagnosis",
  "start_repair",
  "record_work",
  "record_material",
  "complete",
  "record_attachment",
]);

const TASK_ATTACHMENTS_BUCKET = "task-attachments";

function splitStoragePath(storagePath: string): { folder: string; fileName: string } {
  const separator = storagePath.lastIndexOf("/");
  return {
    folder: separator === -1 ? "" : storagePath.slice(0, separator),
    fileName: storagePath.slice(separator + 1),
  };
}

async function authorizeTechnician() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      response: NextResponse.json(
        { error: "Сервис технических заявок не настроен." },
        { status: 503 }
      ),
    };
  }
  const staff = await getCurrentStaff();
  if (!staff) {
    return {
      response: NextResponse.json(
        { error: "Требуется вход с активной учётной записью." },
        { status: 401 }
      ),
    };
  }
  if (!hasAnyRole(staff, ["technician"])) {
    return {
      response: NextResponse.json(
        { error: "Нет доступа к техническим заявкам." },
        { status: 403 }
      ),
    };
  }
  return { supabase, staff };
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapTask(row: RawTask): TechnicianTask | null {
  const room = relationOne(row.room_units);
  if (!room) return null;
  const building = relationOne(room.buildings);
  const attachments: MaintenanceAttachment[] = (row.task_attachments ?? []).map(
    (item) => ({
      id: item.id,
      phase: item.phase,
      storagePath: item.storage_path,
      createdAt: item.created_at,
    })
  );
  const workLogs: MaintenanceWorkLog[] = (row.maintenance_work_logs ?? []).map(
    (item) => ({
      id: item.id,
      logType: item.log_type,
      description: item.description,
      materialName: item.material_name,
      quantity: item.quantity,
      unit: item.unit,
      loggedAt: item.logged_at,
    })
  );
  return {
    id: row.id,
    requestNumber: row.request_number,
    status: row.status,
    priority: row.priority,
    description: row.description,
    diagnosis: row.diagnosis,
    blocksRoom: row.blocks_room,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    roomNumber: room.room_number,
    buildingName: building?.name ?? null,
    attachments,
    workLogs,
  };
}

export async function GET() {
  const auth = await authorizeTechnician();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("maintenance_requests")
    .select(
      `id, request_number, status, priority, description, diagnosis, blocks_room,
       created_at, started_at, completed_at,
       staff_assignments!inner ( staff_id, released_at ),
       room_units ( room_number, buildings ( name ) ),
       task_attachments ( id, phase, storage_path, created_at ),
       maintenance_work_logs ( id, log_type, description, material_name, quantity, unit, logged_at )`
    )
    .eq("staff_assignments.staff_id", auth.staff.userId)
    .is("staff_assignments.released_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Не удалось загрузить назначенные заявки." },
      { status: 503 }
    );
  }
  const tasks = ((data ?? []) as unknown as RawTask[])
    .map(mapTask)
    .filter((task): task is TechnicianTask => task !== null);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const auth = await authorizeTechnician();
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action =
    typeof body.action === "string" && ACTIONS.has(body.action as TechnicianAction)
      ? (body.action as TechnicianAction)
      : null;
  if (!taskId || !action) {
    return NextResponse.json(
      { error: "Неизвестная заявка или действие." },
      { status: 400 }
    );
  }

  // This explicit active-assignment check is repeated before every RPC/insert.
  // The repository RLS policies and SECURITY DEFINER RPCs independently enforce
  // the same ownership rule.
  const { data: task, error: taskError } = await auth.supabase
    .from("maintenance_requests")
    .select("id, status, diagnosis, staff_assignments!inner ( staff_id, released_at )")
    .eq("id", taskId)
    .eq("staff_assignments.staff_id", auth.staff.userId)
    .is("staff_assignments.released_at", null)
    .maybeSingle();
  if (taskError) {
    return NextResponse.json({ error: "Не удалось проверить назначение." }, { status: 503 });
  }
  if (!task) {
    return NextResponse.json(
      { error: "Заявка не найдена или больше не назначена вам." },
      { status: 403 }
    );
  }
  const transitionError = validateTechnicianAction(
    task.status as MaintenanceStatus,
    action
  );
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 409 });
  }
  if (action === "start_repair" && !task.diagnosis) {
    return NextResponse.json(
      { error: "Сначала запишите результат диагностики." },
      { status: 409 }
    );
  }

  if (action === "complete") {
    const [logsResult, attachmentsResult] = await Promise.all([
      auth.supabase
        .from("maintenance_work_logs")
        .select("log_type")
        .eq("maintenance_request_id", taskId),
      auth.supabase
        .from("task_attachments")
        .select("phase")
        .eq("entity_type", "maintenance_request")
        .eq("maintenance_request_id", taskId),
    ]);
    if (logsResult.error || attachmentsResult.error) {
      return NextResponse.json(
        { error: "Не удалось проверить материалы завершения ремонта." },
        { status: 503 }
      );
    }
    const evidenceError = validateMaintenanceCompletionEvidence({
      diagnosis: task.diagnosis as string | null,
      logTypes: (logsResult.data ?? []).map(
        (row) => row.log_type as MaintenanceLogType
      ),
      attachmentPhases: (attachmentsResult.data ?? []).map((row) => row.phase as string),
    });
    if (evidenceError) {
      return NextResponse.json({ error: evidenceError }, { status: 409 });
    }
  }

  let operationError: { code?: string } | null = null;
  if (action === "accept" || action === "start_diagnostics" || action === "complete") {
    const rpc =
      action === "accept"
        ? "fn_accept_maintenance_request"
        : action === "start_diagnostics"
          ? "fn_start_maintenance_request"
          : "fn_complete_maintenance_work";
    const result = await auth.supabase.rpc(rpc, {
      p_maintenance_request_id: taskId,
    });
    operationError = result.error;
  } else if (action === "record_attachment") {
    const storagePath = validateStoragePath(body.storagePath);
    const phase =
      body.phase === "diagnostic" || body.phase === "result" ? body.phase : null;
    if (!storagePath || !phase) {
      return NextResponse.json(
        { error: "Укажите корректный путь и тип фотографии." },
        { status: 400 }
      );
    }
    const { folder, fileName } = splitStoragePath(storagePath);
    const expectedFolder = `${auth.staff.userId}/${taskId}`;
    if (folder !== expectedFolder || !fileName || fileName.includes("/")) {
      return NextResponse.json(
        { error: "Путь фотографии не соответствует сотруднику и заявке." },
        { status: 409 }
      );
    }
    const { data: objects, error: storageError } = await auth.supabase.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .list(folder, { search: fileName, limit: 100 });
    if (storageError) {
      return NextResponse.json(
        { error: "Не удалось проверить фотографию в хранилище." },
        { status: 503 }
      );
    }
    const uploadedObject = objects.find((object) => object.name === fileName);
    if (!uploadedObject) {
      return NextResponse.json(
        { error: "Фотография не найдена или загружена другим сотрудником." },
        { status: 409 }
      );
    }
    const metadata = uploadedObject.metadata as Record<string, unknown> | null;
    const uploadedMimeType = metadata?.mimetype ?? metadata?.contentType;
    const metadataError = validateCleaningPhotoFile({
      mimeType: uploadedMimeType,
      size: metadata?.size,
    });
    if (metadataError) {
      return NextResponse.json({ error: metadataError }, { status: 409 });
    }
    const { data: uploadedFile, error: downloadError } = await auth.supabase.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .download(storagePath);
    if (downloadError || !uploadedFile) {
      return NextResponse.json(
        { error: "Не удалось проверить содержимое фотографии." },
        { status: 503 }
      );
    }
    const uploadedBytes = new Uint8Array(await uploadedFile.arrayBuffer());
    const downloadedFileError = validateCleaningPhotoFile({
      mimeType: uploadedMimeType,
      size: uploadedBytes.byteLength,
    });
    if (downloadedFileError) {
      return NextResponse.json({ error: downloadedFileError }, { status: 409 });
    }
    const bytesError = validateUploadedCleaningPhotoBytes({
      bytes: uploadedBytes,
      mimeType: uploadedMimeType,
    });
    if (bytesError) {
      return NextResponse.json({ error: bytesError }, { status: 409 });
    }
    const result = await auth.supabase.from("task_attachments").insert({
      entity_type: "maintenance_request",
      maintenance_request_id: taskId,
      cleaning_task_id: null,
      room_inspection_id: null,
      phase,
      storage_path: storagePath,
      uploaded_by: auth.staff.userId,
    });
    operationError = result.error;
  } else {
    const log = validateWorkLogInput(action, body);
    if (!log) {
      return NextResponse.json(
        { error: "Проверьте заполнение полей журнала работ." },
        { status: 400 }
      );
    }
    const result = await auth.supabase.rpc("fn_record_maintenance_work_log", {
      p_maintenance_request_id: taskId,
      p_log_type: log.logType,
      p_description: log.description,
      p_material_name: log.materialName,
      p_quantity: log.quantity,
      p_unit: log.unit,
      p_cost_kgs: null,
    });
    operationError = result.error;
  }

  if (operationError) {
    const unavailable =
      operationError.code === "42883" || operationError.code === "PGRST202";
    return NextResponse.json(
      {
        error: unavailable
          ? "Необходимая операция Supabase недоступна."
          : "Изменение не подтверждено. Обновите заявку и повторите.",
      },
      { status: unavailable ? 503 : 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
