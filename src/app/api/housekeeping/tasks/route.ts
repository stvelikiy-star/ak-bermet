import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  isValidProblemNote,
  validateCleaningPhoto,
  validateCleaningPhotoFile,
  validateHousekeepingAction,
  validateRequiredCleaningPhotos,
  type HousekeepingAction,
} from "@/lib/housekeeping-rules";
import { validateUploadedCleaningPhotoBytes } from "@/lib/housekeeping-photo-validation.server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { HousekeepingTask } from "@/types/housekeeping";
import type { CleaningTaskStatus, RoomOperationalStatus } from "@/types/operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RawTask {
  id: string;
  task_number: string;
  status: CleaningTaskStatus;
  due_by: string | null;
  requires_inspection: boolean;
  reported_problem: string | null;
  created_at: string;
  task_attachments: { id: string; phase: "before" | "after"; storage_path: string; created_at: string }[] | null;
  staff_assignments:
    | { staff_id: string; released_at: string | null }
    | { staff_id: string; released_at: string | null }[];
  room_units:
    | {
        room_number: string;
        operational_status: RoomOperationalStatus | null;
        buildings: { name: string | null } | { name: string | null }[] | null;
      }
    | {
        room_number: string;
        operational_status: RoomOperationalStatus | null;
        buildings: { name: string | null } | { name: string | null }[] | null;
      }[]
    | null;
}

const RPC_BY_ACTION: Record<HousekeepingAction, string> = {
  accept: "fn_accept_cleaning_task",
  start: "fn_start_cleaning_task",
  complete: "fn_complete_cleaning_task",
  report_problem: "fn_report_cleaning_problem",
};

const TASK_ATTACHMENTS_BUCKET = "task-attachments";

function splitStoragePath(storagePath: string): { folder: string; fileName: string } {
  const separator = storagePath.lastIndexOf("/");
  return {
    folder: separator === -1 ? "" : storagePath.slice(0, separator),
    fileName: storagePath.slice(separator + 1),
  };
}

async function authorizeHousekeeper() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      response: NextResponse.json(
        { error: "Сервис задач не настроен." },
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
  if (!hasAnyRole(staff, ["housekeeping"])) {
    return {
      response: NextResponse.json(
        { error: "Нет доступа к задачам уборки." },
        { status: 403 }
      ),
    };
  }
  return { supabase, staff };
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  const auth = await authorizeHousekeeper();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("cleaning_tasks")
    .select(
      "id, task_number, status, due_by, requires_inspection, reported_problem, created_at, task_attachments ( id, phase, storage_path, created_at ), staff_assignments!inner ( staff_id, released_at ), room_units ( room_number, operational_status, buildings ( name ) )"
    )
    // RLS already applies the same ownership rule. These predicates make
    // the API contract explicit as defense in depth and exclude released
    // assignment-history rows from the embedded relation.
    .eq("staff_assignments.staff_id", auth.staff.userId)
    .is("staff_assignments.released_at", null)
    .order("due_by", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Не удалось загрузить назначенные задачи. Попробуйте позже." },
      { status: 503 }
    );
  }

  const tasks: HousekeepingTask[] = ((data ?? []) as unknown as RawTask[])
    .map((row) => {
      const room = relationOne(row.room_units);
      if (!room) return null;
      const building = relationOne(room.buildings);
      return {
        id: row.id,
        taskNumber: row.task_number,
        status: row.status,
        roomNumber: room.room_number,
        buildingName: building?.name ?? null,
        roomOperationalStatus: room.operational_status,
        dueBy: row.due_by,
        requiresInspection: row.requires_inspection,
        reportedProblem: row.reported_problem,
        createdAt: row.created_at,
        attachments: (row.task_attachments ?? [])
          .filter((item) => item.phase === "before" || item.phase === "after")
          .map((item) => ({ id: item.id, phase: item.phase, storagePath: item.storage_path, createdAt: item.created_at })),
      };
    })
    .filter((task): task is HousekeepingTask => task !== null);

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const auth = await authorizeHousekeeper();
  if ("response" in auth) return auth.response;

  let body: {
    taskId?: unknown;
    action?: unknown;
    note?: unknown;
    blocksRoom?: unknown;
    storagePath?: unknown;
    phase?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const recordsAttachment = action === "record_attachment";
  if (!taskId || (!recordsAttachment && !Object.hasOwn(RPC_BY_ACTION, action))) {
    return NextResponse.json({ error: "Неизвестная задача или действие." }, { status: 400 });
  }
  const typedAction = recordsAttachment ? null : (action as HousekeepingAction);

  // RLS возвращает строку только при активном назначении auth.uid().
  const { data: task, error: taskError } = await auth.supabase
    .from("cleaning_tasks")
    .select("id, status, task_attachments ( phase ), staff_assignments!inner ( staff_id, released_at )")
    .eq("id", taskId)
    .eq("staff_assignments.staff_id", auth.staff.userId)
    .is("staff_assignments.released_at", null)
    .maybeSingle();
  if (taskError) {
    return NextResponse.json({ error: "Не удалось проверить задачу." }, { status: 503 });
  }
  if (!task) {
    return NextResponse.json(
      { error: "Задача не найдена или больше не назначена вам." },
      { status: 403 }
    );
  }

  if (recordsAttachment) {
    const phase = body.phase === "before" || body.phase === "after" ? body.phase : null;
    if (!phase) return NextResponse.json({ error: "Укажите тип фотографии." }, { status: 400 });
    const photoError = validateCleaningPhoto({ status: task.status as CleaningTaskStatus, phase, storagePath: body.storagePath });
    if (photoError) return NextResponse.json({ error: photoError }, { status: 409 });
    const storagePath = (body.storagePath as string).trim();
    const { folder, fileName } = splitStoragePath(storagePath);
    // Storage list() does not expose object ownership in the installed
    // Supabase client. Bind the object to both the authenticated uploader and
    // this task through a server-enforced path instead:
    //   <staff-id>/<cleaning-task-id>/<file-name>
    // The exact folder check also prevents one task from recording another
    // task's already uploaded photograph.
    const expectedFolder = `${auth.staff.userId}/${taskId}`;
    if (folder !== expectedFolder || !fileName || fileName.includes("/")) {
      return NextResponse.json(
        { error: "Путь фотографии не соответствует сотруднику и задаче." },
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
    const uploadedPhotoError = validateCleaningPhotoFile({
      mimeType: uploadedMimeType,
      size: metadata?.size,
    });
    if (uploadedPhotoError) {
      return NextResponse.json({ error: uploadedPhotoError }, { status: 409 });
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
    const downloadedPhotoError = validateCleaningPhotoFile({
      mimeType: uploadedMimeType,
      size: uploadedBytes.byteLength,
    });
    if (downloadedPhotoError) {
      return NextResponse.json({ error: downloadedPhotoError }, { status: 409 });
    }
    const uploadedPhotoBytesError = validateUploadedCleaningPhotoBytes({
      bytes: uploadedBytes,
      mimeType: uploadedMimeType,
    });
    if (uploadedPhotoBytesError) {
      return NextResponse.json({ error: uploadedPhotoBytesError }, { status: 409 });
    }
    const result = await auth.supabase.from("task_attachments").insert({
      entity_type: "cleaning_task",
      cleaning_task_id: taskId,
      maintenance_request_id: null,
      room_inspection_id: null,
      phase,
      storage_path: storagePath,
      uploaded_by: auth.staff.userId,
    });
    if (result.error) return NextResponse.json({ error: "Не удалось сохранить фотографию." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  const transitionError = validateHousekeepingAction(task.status as CleaningTaskStatus, typedAction!);
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 409 });
  }

  if (typedAction === "complete" || typedAction === "report_problem") {
    const phases = ((task.task_attachments ?? []) as { phase: "before" | "after" }[]).map((item) => item.phase);
    const photoError = validateRequiredCleaningPhotos({ action: typedAction, phases });
    if (photoError) return NextResponse.json({ error: photoError }, { status: 409 });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (typedAction === "report_problem" && !isValidProblemNote(note)) {
    return NextResponse.json(
      { error: "Опишите проблему: от 3 до 1000 символов." },
      { status: 400 }
    );
  }

  const args =
    typedAction === "report_problem"
      ? {
          p_cleaning_task_id: taskId,
          p_note: note,
          p_blocks_room: body.blocksRoom === true,
        }
      : { p_cleaning_task_id: taskId };
  const { error: rpcError } = await auth.supabase.rpc(
    RPC_BY_ACTION[typedAction!],
    args
  );
  if (rpcError) {
    const unavailable =
      rpcError.code === "42883" || rpcError.code === "PGRST202";
    return NextResponse.json(
      {
        error: unavailable
          ? "Необходимая операция Supabase недоступна. Обратитесь к администратору."
          : "Не удалось изменить задачу. Обновите список и повторите попытку.",
      },
      { status: unavailable ? 503 : 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
