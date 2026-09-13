import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  AssigneeOption,
  BuildingOption,
  CleaningTaskRow,
  MaintenanceRequestRow,
  OperationalNotificationRow,
  OperationsData,
  OperationsRoomRef,
  RoomInspectionRow,
  RoomOperationalStatus,
} from "@/types/operations";

// Server-side read layer for the Operational CRM. Every query runs with the
// signed-in staff JWT and therefore remains constrained by RLS. This module is
// SELECT-only and never uses the service role.
const RECENT_LIMIT = 200;

interface RawProfile { full_name: string | null; }
interface RawBuilding { name: string | null; }
interface RawRoomUnit {
  id: string;
  room_number: string;
  building_id: string | null;
  operational_status: RoomOperationalStatus | null;
  buildings: RawBuilding | null;
}
interface RawStaffAssignment {
  staff_id: string;
  released_at: string | null;
  profiles: RawProfile | null;
}
interface RawCleaningTask {
  id: string;
  task_number: string;
  status: CleaningTaskRow["status"];
  requires_inspection: boolean;
  reported_problem: string | null;
  due_by: string | null;
  created_at: string;
  room_units: RawRoomUnit | null;
  staff_assignments: RawStaffAssignment[] | null;
}
interface RawMaintenanceRequest {
  id: string;
  request_number: string;
  status: MaintenanceRequestRow["status"];
  priority: MaintenanceRequestRow["priority"];
  description: string;
  blocks_room: boolean;
  created_at: string;
  room_units: RawRoomUnit | null;
  staff_assignments: RawStaffAssignment[] | null;
}
interface RawRoomInspection {
  id: string;
  trigger_reason: RoomInspectionRow["triggerReason"];
  result: RoomInspectionRow["result"];
  notes: string | null;
  created_at: string;
  inspected_by: string;
  room_units: RawRoomUnit | null;
  profiles: RawProfile | null;
}
interface RawNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  recipient_id: string;
  profiles: RawProfile | null;
}

function mapRoom(raw: RawRoomUnit | null): OperationsRoomRef | null {
  if (!raw) return null;
  return {
    id: raw.id,
    roomNumber: raw.room_number,
    buildingId: raw.building_id,
    buildingName: raw.buildings?.name ?? null,
    operationalStatus: raw.operational_status,
  };
}

function mapActiveAssignee(raw: RawStaffAssignment[] | null): AssigneeOption | null {
  const active = (raw ?? []).find((a) => a.released_at === null);
  if (!active || !active.profiles?.full_name) return null;
  return { id: active.staff_id, fullName: active.profiles.full_name };
}

async function fetchRooms(supabase: SupabaseClient): Promise<OperationsRoomRef[]> {
  const { data, error } = await supabase
    .from("room_units")
    .select("id, room_number, building_id, operational_status, buildings ( name )")
    .is("deleted_at", null)
    .limit(1000);
  if (error) throw error;
  return ((data ?? []) as unknown as RawRoomUnit[]).map((row) => mapRoom(row) as OperationsRoomRef);
}

async function fetchBuildings(supabase: SupabaseClient): Promise<BuildingOption[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
}

const ROOM_UNIT_EMBED = "id, room_number, building_id, operational_status, buildings ( name )";
const ASSIGNMENT_EMBED = "staff_id, released_at, profiles ( full_name )";

async function fetchCleaningTasks(supabase: SupabaseClient): Promise<CleaningTaskRow[]> {
  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select(`id, task_number, status, requires_inspection, reported_problem, due_by, created_at,
       room_units ( ${ROOM_UNIT_EMBED} ),
       staff_assignments ( ${ASSIGNMENT_EMBED} )`)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;

  return ((data ?? []) as unknown as RawCleaningTask[]).map((row) => ({
    id: row.id,
    taskNumber: row.task_number,
    status: row.status,
    requiresInspection: row.requires_inspection,
    reportedProblem: row.reported_problem,
    dueBy: row.due_by,
    createdAt: row.created_at,
    room: mapRoom(row.room_units),
    assignee: mapActiveAssignee(row.staff_assignments),
  }));
}

async function fetchMaintenanceRequests(supabase: SupabaseClient): Promise<MaintenanceRequestRow[]> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(`id, request_number, status, priority, description, blocks_room, created_at,
       room_units ( ${ROOM_UNIT_EMBED} ),
       staff_assignments ( ${ASSIGNMENT_EMBED} )`)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;

  return ((data ?? []) as unknown as RawMaintenanceRequest[]).map((row) => ({
    id: row.id,
    requestNumber: row.request_number,
    status: row.status,
    priority: row.priority,
    description: row.description,
    blocksRoom: row.blocks_room,
    createdAt: row.created_at,
    room: mapRoom(row.room_units),
    assignee: mapActiveAssignee(row.staff_assignments),
  }));
}

async function fetchRoomInspections(supabase: SupabaseClient): Promise<RoomInspectionRow[]> {
  const { data, error } = await supabase
    .from("room_inspections")
    .select(`id, trigger_reason, result, notes, created_at, inspected_by,
       room_units ( ${ROOM_UNIT_EMBED} ),
       profiles ( full_name )`)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;

  return ((data ?? []) as unknown as RawRoomInspection[]).map((row) => ({
    id: row.id,
    triggerReason: row.trigger_reason,
    result: row.result,
    notes: row.notes,
    createdAt: row.created_at,
    room: mapRoom(row.room_units),
    inspector: row.profiles?.full_name
      ? { id: row.inspected_by, fullName: row.profiles.full_name }
      : null,
  }));
}

async function fetchNotifications(supabase: SupabaseClient): Promise<OperationalNotificationRow[]> {
  const { data, error } = await supabase
    .from("operational_notifications")
    .select(`id, notification_type, title, body, is_read, created_at, recipient_id,
       profiles ( full_name )`)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;

  return ((data ?? []) as unknown as RawNotification[]).map((row) => ({
    id: row.id,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    recipient: row.profiles?.full_name
      ? { id: row.recipient_id, fullName: row.profiles.full_name }
      : null,
  }));
}

function uniqueAssignees(options: (AssigneeOption | null)[]): AssigneeOption[] {
  const seen = new Map<string, AssigneeOption>();
  for (const opt of options) {
    if (opt && opt.fullName && !seen.has(opt.fullName)) seen.set(opt.fullName, opt);
  }
  return Array.from(seen.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
}

export async function getOperationsData(): Promise<OperationsData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase staff client is unavailable");

  const [rooms, buildings, cleaningTasks, maintenanceRequests, roomInspections, notifications] =
    await Promise.all([
      fetchRooms(supabase),
      fetchBuildings(supabase),
      fetchCleaningTasks(supabase),
      fetchMaintenanceRequests(supabase),
      fetchRoomInspections(supabase),
      fetchNotifications(supabase),
    ]);

  const assignees = uniqueAssignees([
    ...cleaningTasks.map((t) => t.assignee),
    ...maintenanceRequests.map((t) => t.assignee),
    ...roomInspections.map((t) => t.inspector),
    ...notifications.map((t) => t.recipient),
  ]);

  return {
    rooms,
    buildings,
    assignees,
    cleaningTasks,
    maintenanceRequests,
    roomInspections,
    notifications,
  };
}
