import { NextResponse } from "next/server";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  isValidProblemNote,
  validateHousekeepingAction,
  type HousekeepingAction,
} from "@/lib/housekeeping-rules";
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
      "id, task_number, status, due_by, requires_inspection, reported_problem, created_at, staff_assignments!inner ( staff_id, released_at ), room_units ( room_number, operational_status, buildings ( name ) )"
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!taskId || !Object.hasOwn(RPC_BY_ACTION, action)) {
    return NextResponse.json({ error: "Неизвестная задача или действие." }, { status: 400 });
  }
  const typedAction = action as HousekeepingAction;

  // RLS возвращает строку только при активном назначении auth.uid().
  const { data: task, error: taskError } = await auth.supabase
    .from("cleaning_tasks")
    .select("id, status, staff_assignments!inner ( staff_id, released_at )")
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

  const transitionError = validateHousekeepingAction(
    task.status as CleaningTaskStatus,
    typedAction
  );
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 409 });
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
    RPC_BY_ACTION[typedAction],
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
