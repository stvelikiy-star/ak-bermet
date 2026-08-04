"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerStatCard from "@/components/manager/ManagerStatCard";
import OperationsFilters, {
  EMPTY_OPERATIONS_FILTERS,
  type OperationsFilterState,
} from "@/components/manager/OperationsFilters";
import {
  CLEANING_TASK_STATUS_LABELS,
  INSPECTION_RESULT_LABELS,
  INSPECTION_TRIGGER_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_STYLES,
  SUMMARY_CARD_STATUSES,
  formatDateTime,
  summarizeRooms,
} from "@/lib/operations-labels";
import {
  IconBed2,
  IconCheck,
  IconClock,
  IconClose,
  IconDrop,
  IconEye,
  IconShield,
} from "@/components/ui/icons";
import type {
  CleaningTaskRow,
  MaintenanceRequestRow,
  OperationalNotificationRow,
  OperationsData,
  RoomInspectionRow,
  RoomOperationalStatus,
} from "@/types/operations";

const STATUS_ICON: Record<RoomOperationalStatus, typeof IconBed2> = {
  checkout_pending: IconClock,
  cleaning_required: IconDrop,
  cleaning_in_progress: IconDrop,
  inspection_required: IconEye,
  ready: IconCheck,
  maintenance_required: IconShield,
  maintenance_in_progress: IconShield,
  blocked: IconClose,
};

type LoadState = "loading" | "ready" | "not_configured" | "error";

export default function ManagerOperationsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<OperationsData | null>(null);
  const [filters, setFilters] = useState<OperationsFilterState>(
    EMPTY_OPERATIONS_FILTERS
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/manager/operations");
        const json = await res.json();
        if (!active) return;
        if (json.configured === false) {
          setState("not_configured");
          setMessage(json.message || "Supabase не настроен.");
          return;
        }
        if (!res.ok || !json.ok) {
          setState("error");
          setMessage(json.message || "Не удалось загрузить данные.");
          return;
        }
        setData(json.data as OperationsData);
        setState("ready");
      } catch {
        if (active) {
          setState("error");
          setMessage("Не удалось загрузить данные. Проверьте соединение.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () => summarizeRooms(data?.rooms ?? [], filters.building || null),
    [data, filters.building]
  );

  const cleaningTasks = useMemo(
    () => filterCleaningTasks(data?.cleaningTasks ?? [], filters),
    [data, filters]
  );
  const maintenanceRequests = useMemo(
    () => filterMaintenanceRequests(data?.maintenanceRequests ?? [], filters),
    [data, filters]
  );
  const roomInspections = useMemo(
    () => filterRoomInspections(data?.roomInspections ?? [], filters),
    [data, filters]
  );
  const notifications = useMemo(
    () => filterNotifications(data?.notifications ?? [], filters),
    [data, filters]
  );

  return (
    <>
      <ManagerHeader title="Операции" />
      <main className="space-y-6 p-4 lg:p-8">
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Операционная панель — только чтение. Изменение статусов уборки,
          ремонта и проверок выполняется в рабочих процессах персонала, не
          здесь.
        </div>

        {state === "loading" && (
          <p className="py-10 text-center text-muted">Загрузка данных…</p>
        )}

        {state === "not_configured" && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message} Пока переменные окружения не заданы, экран не может
            обращаться к Supabase.
          </div>
        )}

        {state === "error" && (
          <p className="py-10 text-center text-red-600">{message}</p>
        )}

        {state === "ready" && data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ManagerStatCard
                label="Всего номеров"
                value={summary.total}
                icon={IconBed2}
              />
              {SUMMARY_CARD_STATUSES.map((s) => (
                <ManagerStatCard
                  key={s}
                  label={ROOM_STATUS_LABELS[s]}
                  value={summary.byStatus[s]}
                  icon={STATUS_ICON[s]}
                />
              ))}
            </div>

            <OperationsFilters
              value={filters}
              onChange={setFilters}
              buildings={data.buildings}
              assignees={data.assignees}
            />

            <Section title={`Уборка (${cleaningTasks.length})`}>
              {cleaningTasks.length === 0 ? (
                <EmptyState text="Нет задач на уборку по выбранным фильтрам." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-3 font-medium">Номер</th>
                        <th className="px-3 py-3 font-medium">Задача</th>
                        <th className="px-3 py-3 font-medium">Статус</th>
                        <th className="px-3 py-3 font-medium">Проверка</th>
                        <th className="px-3 py-3 font-medium">Исполнитель</th>
                        <th className="px-3 py-3 font-medium">Создана</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {cleaningTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-cream/40">
                          <td className="px-3 py-3 text-emerald-deep">
                            {t.room
                              ? `${t.room.buildingName ?? "—"}, №${t.room.roomNumber}`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted">
                            {t.taskNumber}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {CLEANING_TASK_STATUS_LABELS[t.status]}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {t.requiresInspection ? "Требуется" : "Не требуется"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {t.assignee?.fullName ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {formatDateTime(t.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={`Ремонт (${maintenanceRequests.length})`}>
              {maintenanceRequests.length === 0 ? (
                <EmptyState text="Нет заявок на ремонт по выбранным фильтрам." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-3 font-medium">Номер</th>
                        <th className="px-3 py-3 font-medium">Заявка</th>
                        <th className="px-3 py-3 font-medium">Статус</th>
                        <th className="px-3 py-3 font-medium">Приоритет</th>
                        <th className="px-3 py-3 font-medium">Блокирует продажу</th>
                        <th className="px-3 py-3 font-medium">Исполнитель</th>
                        <th className="px-3 py-3 font-medium">Создана</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {maintenanceRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-cream/40">
                          <td className="px-3 py-3 text-emerald-deep">
                            {r.room
                              ? `${r.room.buildingName ?? "—"}, №${r.room.roomNumber}`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted">
                            {r.requestNumber}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {MAINTENANCE_STATUS_LABELS[r.status]}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {MAINTENANCE_PRIORITY_LABELS[r.priority]}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {r.blocksRoom ? "Да" : "Нет"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {r.assignee?.fullName ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {formatDateTime(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={`Проверки номеров (${roomInspections.length})`}>
              {roomInspections.length === 0 ? (
                <EmptyState text="Нет проверок номеров по выбранным фильтрам." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-3 font-medium">Номер</th>
                        <th className="px-3 py-3 font-medium">Причина</th>
                        <th className="px-3 py-3 font-medium">Результат</th>
                        <th className="px-3 py-3 font-medium">Проверил(а)</th>
                        <th className="px-3 py-3 font-medium">Дата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {roomInspections.map((i) => (
                        <tr key={i.id} className="hover:bg-cream/40">
                          <td className="px-3 py-3 text-emerald-deep">
                            {i.room
                              ? `${i.room.buildingName ?? "—"}, №${i.room.roomNumber}`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {INSPECTION_TRIGGER_LABELS[i.triggerReason]}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                                i.result === "passed"
                                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                  : "bg-red-100 text-red-700 ring-red-200"
                              }`}
                            >
                              {INSPECTION_RESULT_LABELS[i.result]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {i.inspector?.fullName ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {formatDateTime(i.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={`Уведомления (${notifications.length})`}>
              {notifications.length === 0 ? (
                <EmptyState text="Нет уведомлений по выбранным фильтрам." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-gold/15 bg-white shadow-soft">
                  <ul className="divide-y divide-gold/10">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-emerald-deep">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="truncate text-xs text-muted">{n.body}</p>
                          )}
                          <p className="text-xs text-muted">
                            {n.recipient?.fullName ?? "—"} · {formatDateTime(n.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                            n.isRead
                              ? "bg-gray-100 text-gray-600 ring-gray-200"
                              : "bg-amber-100 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {n.isRead ? "Прочитано" : "Новое"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gold/25 bg-white/60 px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function filterCleaningTasks(
  rows: CleaningTaskRow[],
  f: OperationsFilterState
): CleaningTaskRow[] {
  return rows.filter((t) => {
    if (f.building && t.room?.buildingId !== f.building) return false;
    if (f.roomStatus && t.room?.operationalStatus !== f.roomStatus) return false;
    if (f.cleaningStatus && t.status !== f.cleaningStatus) return false;
    if (f.assignee && t.assignee?.id !== f.assignee) return false;
    return true;
  });
}

function filterMaintenanceRequests(
  rows: MaintenanceRequestRow[],
  f: OperationsFilterState
): MaintenanceRequestRow[] {
  return rows.filter((r) => {
    if (f.building && r.room?.buildingId !== f.building) return false;
    if (f.roomStatus && r.room?.operationalStatus !== f.roomStatus) return false;
    if (f.maintenanceStatus && r.status !== f.maintenanceStatus) return false;
    if (f.assignee && r.assignee?.id !== f.assignee) return false;
    return true;
  });
}

function filterRoomInspections(
  rows: RoomInspectionRow[],
  f: OperationsFilterState
): RoomInspectionRow[] {
  return rows.filter((i) => {
    if (f.building && i.room?.buildingId !== f.building) return false;
    if (f.roomStatus && i.room?.operationalStatus !== f.roomStatus) return false;
    if (f.assignee && i.inspector?.id !== f.assignee) return false;
    return true;
  });
}

function filterNotifications(
  rows: OperationalNotificationRow[],
  f: OperationsFilterState
): OperationalNotificationRow[] {
  return rows.filter((n) => {
    if (f.assignee && n.recipient?.id !== f.assignee) return false;
    return true;
  });
}
