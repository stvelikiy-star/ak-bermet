import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  canRoomBecomeReady,
  inspectionResultForAction,
  normalizeInspectionNote,
  validateInspectionAction,
  type InspectionAction,
} from "@/lib/inspection-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  InspectionAttachment,
  InspectionHistoryItem,
  InspectionQueueItem,
} from "@/types/inspection";
import type {
  CleaningTaskStatus,
  InspectionResult,
  InspectionTriggerReason,
  MaintenanceStatus,
  RoomOperationalStatus,
} from "@/types/operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const ACTIONS = new Set<InspectionAction>([
  "approve",
  "return_cleaning",
  "return_maintenance",
  "mark_blocking_problem",
]);
const ACTIVE_MAINTENANCE: MaintenanceStatus[] = [
  "reported",
  "acknowledged",
  "in_progress",
  "on_hold",
  "completed",
];

type Relation<T> = T | T[] | null;

interface RawRoom {
  id: string;
  room_number: string;
  operational_status: RoomOperationalStatus;
  buildings: Relation<{ name: string | null }>;
}

interface RawAttachment {
  id: string;
  phase: InspectionAttachment["phase"];
  storage_path: string;
  created_at: string;
}

interface RawInspection {
  id: string;
  room_unit_id: string;
  cleaning_task_id: string | null;
  maintenance_request_id: string | null;
  trigger_reason: InspectionTriggerReason;
  result: InspectionResult;
  notes: string | null;
  created_at: string;
  profiles: Relation<{ full_name: string | null }>;
  task_attachments: RawAttachment[] | null;
}

interface RawCleaning {
  id: string;
  task_number: string;
  room_unit_id: string;
  status: CleaningTaskStatus;
  requires_inspection: boolean;
  reported_problem: string | null;
  completed_at: string | null;
  created_at: string;
  room_units: Relation<RawRoom>;
  task_attachments: RawAttachment[] | null;
}

interface RawMaintenance {
  id: string;
  request_number: string;
  room_unit_id: string;
  status: MaintenanceStatus;
  description: string;
  diagnosis: string | null;
  blocks_room: boolean;
  completed_at: string | null;
  created_at: string;
  room_units: Relation<RawRoom>;
  task_attachments: RawAttachment[] | null;
}

async function authorizeManager() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      response: NextResponse.json(
        { error: "Сервис проверок не настроен." },
        { status: 503 }
      ),
    };
  }
  const staff = await getCurrentStaff();
  if (!staff) {
    return {
      response: NextResponse.json(
        { error: "Требуется вход в систему." },
        { status: 401 }
      ),
    };
  }
  if (!hasAnyRole(staff, [...MANAGER_ROLES])) {
    return {
      response: NextResponse.json(
        { error: "Нет доступа к проверкам номеров." },
        { status: 403 }
      ),
    };
  }
  return { supabase, staff };
}

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapAttachment(row: RawAttachment): InspectionAttachment {
  return {
    id: row.id,
    phase: row.phase,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

function historyFor(
  rows: RawInspection[],
  field: "cleaning_task_id" | "maintenance_request_id",
  id: string
): InspectionHistoryItem[] {
  return rows
    .filter((row) => row[field] === id)
    .map((row) => ({
      id: row.id,
      result: row.result,
      notes: row.notes,
      createdAt: row.created_at,
      triggerReason: row.trigger_reason,
      inspectorName: one(row.profiles)?.full_name ?? null,
      attachments: (row.task_attachments ?? []).map(mapAttachment),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function GET() {
  const auth = await authorizeManager();
  if ("response" in auth) return auth.response;

  const [cleaningResult, maintenanceResult, inspectionResult, blockingResult] =
    await Promise.all([
      auth.supabase
        .from("cleaning_tasks")
        .select(
          "id, task_number, room_unit_id, status, requires_inspection, reported_problem, completed_at, created_at, room_units!inner ( id, room_number, operational_status, buildings ( name ) ), task_attachments ( id, phase, storage_path, created_at )"
        )
        .eq("status", "done")
        .eq("requires_inspection", true)
        .eq("room_units.operational_status", "inspection_required")
        .order("completed_at", { ascending: true, nullsFirst: false })
        .limit(100),
      auth.supabase
        .from("maintenance_requests")
        .select(
          "id, request_number, room_unit_id, status, description, diagnosis, blocks_room, completed_at, created_at, room_units!inner ( id, room_number, operational_status, buildings ( name ) ), task_attachments ( id, phase, storage_path, created_at )"
        )
        .in("status", ["completed", "closed"])
        .in("room_units.operational_status", [
          "maintenance_required",
          "maintenance_in_progress",
          "blocked",
          "inspection_required",
        ])
        .order("completed_at", { ascending: true, nullsFirst: false })
        .limit(100),
      auth.supabase
        .from("room_inspections")
        .select(
          "id, room_unit_id, cleaning_task_id, maintenance_request_id, trigger_reason, result, notes, created_at, profiles!room_inspections_inspected_by_fkey ( full_name ), task_attachments ( id, phase, storage_path, created_at )"
        )
        .order("created_at", { ascending: false })
        .limit(500),
      auth.supabase
        .from("maintenance_requests")
        .select("id, room_unit_id")
        .eq("blocks_room", true)
        .in("status", ACTIVE_MAINTENANCE)
        .limit(500),
    ]);

  const queryError =
    cleaningResult.error ??
    maintenanceResult.error ??
    inspectionResult.error ??
    blockingResult.error;
  if (queryError) {
    return NextResponse.json(
      { error: "Не удалось загрузить очередь проверок." },
      { status: 503 }
    );
  }

  const inspections = (inspectionResult.data ?? []) as unknown as RawInspection[];
  const blockingByRoom = new Map<string, Set<string>>();
  for (const row of (blockingResult.data ?? []) as {
    id: string;
    room_unit_id: string;
  }[]) {
    const ids = blockingByRoom.get(row.room_unit_id) ?? new Set<string>();
    ids.add(row.id);
    blockingByRoom.set(row.room_unit_id, ids);
  }

  const items: InspectionQueueItem[] = [];
  for (const task of (cleaningResult.data ?? []) as unknown as RawCleaning[]) {
    const room = one(task.room_units);
    if (!room) continue;
    items.push({
      id: task.id,
      source: "cleaning",
      roomId: room.id,
      roomNumber: room.room_number,
      buildingName: one(room.buildings)?.name ?? null,
      roomStatus: room.operational_status,
      taskNumber: task.task_number,
      taskStatus: task.status,
      resultSummary: task.completed_at,
      reportedProblem: task.reported_problem,
      requiresInspection: task.requires_inspection,
      activeBlockingMaintenance: (blockingByRoom.get(room.id)?.size ?? 0) > 0,
      attachments: (task.task_attachments ?? []).map(mapAttachment),
      inspections: historyFor(inspections, "cleaning_task_id", task.id),
      createdAt: task.created_at,
    });
  }
  for (const task of (maintenanceResult.data ?? []) as unknown as RawMaintenance[]) {
    const room = one(task.room_units);
    if (!room) continue;
    const blockers = blockingByRoom.get(room.id);
    const hasOtherBlocker = [...(blockers ?? [])].some((id) => id !== task.id);
    items.push({
      id: task.id,
      source: "maintenance",
      roomId: room.id,
      roomNumber: room.room_number,
      buildingName: one(room.buildings)?.name ?? null,
      roomStatus: room.operational_status,
      taskNumber: task.request_number,
      taskStatus: task.status,
      resultSummary: task.diagnosis,
      reportedProblem: task.description,
      requiresInspection: true,
      activeBlockingMaintenance: hasOtherBlocker,
      attachments: (task.task_attachments ?? []).map(mapAttachment),
      inspections: historyFor(inspections, "maintenance_request_id", task.id),
      createdAt: task.created_at,
    });
  }

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await authorizeManager();
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const source =
    body.source === "cleaning" || body.source === "maintenance"
      ? body.source
      : null;
  const action =
    typeof body.action === "string" && ACTIONS.has(body.action as InspectionAction)
      ? (body.action as InspectionAction)
      : null;
  const note = normalizeInspectionNote(body.note);
  if (!taskId || !source || !action) {
    return NextResponse.json(
      { error: "Неизвестная задача или действие." },
      { status: 400 }
    );
  }
  if (!note) {
    return NextResponse.json(
      { error: "Добавьте примечание длиной до 2000 символов." },
      { status: 400 }
    );
  }
  if (action === "mark_blocking_problem") {
    const taskTable =
      source === "cleaning" ? "cleaning_tasks" : "maintenance_requests";
    const { data: sourceTask, error: sourceTaskError } = await auth.supabase
      .from(taskTable)
      .select("id, room_unit_id")
      .eq("id", taskId)
      .maybeSingle();
    if (sourceTaskError) {
      return NextResponse.json(
        { error: "Не удалось проверить задачу перед блокировкой номера." },
        { status: 503 }
      );
    }
    if (!sourceTask) {
      return NextResponse.json(
        { error: "Задача не найдена или недоступна." },
        { status: 404 }
      );
    }

    const rpcResult = await auth.supabase.rpc(
      "fn_mark_inspection_blocking_problem",
      {
        p_room_unit_id: sourceTask.room_unit_id,
        p_note: note,
        p_cleaning_task_id: source === "cleaning" ? taskId : null,
        p_maintenance_request_id: source === "maintenance" ? taskId : null,
      }
    );
    if (rpcResult.error) {
      const unavailable =
        rpcResult.error.code === "42883" || rpcResult.error.code === "PGRST202";
      return NextResponse.json(
        {
          error: unavailable
            ? "Операция блокировки номера не установлена в Supabase."
            : "Не удалось создать блокирующую техническую заявку. Обновите очередь и повторите.",
        },
        { status: unavailable ? 503 : 409 }
      );
    }
    const result = Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data;
    return NextResponse.json({
      ok: true,
      maintenanceRequestId: result?.maintenance_request_id ?? null,
      inspectionId: result?.room_inspection_id ?? null,
      created: result?.created ?? false,
      roomStatus: result?.room_status ?? "blocked",
    });
  }

  const table = source === "cleaning" ? "cleaning_tasks" : "maintenance_requests";
  const { data: task, error: taskError } = await auth.supabase
    .from(table)
    .select("id, room_unit_id, status, room_units!inner ( operational_status )")
    .eq("id", taskId)
    .maybeSingle();
  if (taskError) {
    return NextResponse.json({ error: "Не удалось проверить задачу." }, { status: 503 });
  }
  if (!task) {
    return NextResponse.json(
      { error: "Задача не найдена или недоступна." },
      { status: 404 }
    );
  }

  const room = one(
    task.room_units as Relation<{ operational_status: RoomOperationalStatus }>
  );
  if (!room) {
    return NextResponse.json({ error: "Номер задачи не найден." }, { status: 409 });
  }

  const { data: blockers, error: blockerError } = await auth.supabase
    .from("maintenance_requests")
    .select("id")
    .eq("room_unit_id", task.room_unit_id)
    .eq("blocks_room", true)
    .in("status", ACTIVE_MAINTENANCE)
    .neq("id", source === "maintenance" ? taskId : "00000000-0000-0000-0000-000000000000");
  if (blockerError) {
    return NextResponse.json(
      { error: "Не удалось проверить активные технические блокировки." },
      { status: 503 }
    );
  }

  let latestCleaningStatus: CleaningTaskStatus | null =
    source === "cleaning" ? (task.status as CleaningTaskStatus) : null;
  if (source === "maintenance" && action === "approve") {
    const { data: cleaning, error: cleaningError } = await auth.supabase
      .from("cleaning_tasks")
      .select("status")
      .eq("room_unit_id", task.room_unit_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cleaningError) {
      return NextResponse.json(
        { error: "Не удалось подтвердить завершение уборки." },
        { status: 503 }
      );
    }
    latestCleaningStatus =
      (cleaning?.status as CleaningTaskStatus | undefined) ?? null;
  }
  if (
    action === "approve" &&
    !canRoomBecomeReady({
      cleaningStatus: latestCleaningStatus,
      inspectionRequired: true,
      latestInspectionResult: "passed",
      hasActiveBlockingMaintenance: (blockers ?? []).length > 0,
    })
  ) {
    return NextResponse.json(
      {
        error:
          latestCleaningStatus !== "done"
            ? "Номер нельзя одобрить: уборка не завершена."
            : "Номер нельзя одобрить: есть активная блокирующая техническая заявка.",
      },
      { status: 409 }
    );
  }

  let roomStatus = room.operational_status;
  if ((blockers ?? []).length === 0 &&
      source === "maintenance" &&
      task.status === "completed") {
    const closeResult = await auth.supabase.rpc("fn_close_maintenance_request", {
      p_maintenance_request_id: taskId,
      p_resulting_status: "inspection_required",
      p_note: note,
    });
    if (closeResult.error) {
      return NextResponse.json(
        { error: "Не удалось закрыть выполненный ремонт перед проверкой." },
        { status: 409 }
      );
    }
    roomStatus = "inspection_required";
    task.status = "closed";
  }

  const validationError = validateInspectionAction({
    source,
    action,
    roomStatus,
    cleaningStatus:
      source === "cleaning" ? (task.status as CleaningTaskStatus) : undefined,
    maintenanceStatus:
      source === "maintenance" ? (task.status as MaintenanceStatus) : undefined,
    hasActiveBlockingMaintenance: (blockers ?? []).length > 0,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 409 });
  }

  const result = inspectionResultForAction(action);
  if (!result) {
    return NextResponse.json({ error: "Действие недоступно." }, { status: 409 });
  }
  const rpcResult = await auth.supabase.rpc("fn_record_room_inspection", {
    p_room_unit_id: task.room_unit_id,
    p_trigger_reason: source === "cleaning" ? "post_cleaning" : "post_maintenance",
    p_result: result,
    p_cleaning_task_id: source === "cleaning" ? taskId : null,
    p_maintenance_request_id: source === "maintenance" ? taskId : null,
    p_notes: note,
  });
  if (rpcResult.error) {
    const unavailable =
      rpcResult.error.code === "42883" || rpcResult.error.code === "PGRST202";
    return NextResponse.json(
      {
        error: unavailable
          ? "Операция проверки не установлена в Supabase."
          : "Проверка не сохранена. Обновите очередь и повторите.",
      },
      { status: unavailable ? 503 : 409 }
    );
  }
  return NextResponse.json({ ok: true, inspectionId: rpcResult.data });
}
