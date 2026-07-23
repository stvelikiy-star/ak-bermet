"use client";

import { Select } from "@/components/forms/fields";
import {
  CLEANING_TASK_STATUS_LABELS,
  CLEANING_TASK_STATUS_ORDER,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_ORDER,
  ROOM_STATUS_LABELS,
  SUMMARY_CARD_STATUSES,
} from "@/lib/operations-labels";
import type { AssigneeOption, BuildingOption } from "@/types/operations";

export type OperationsFilterState = {
  building: string;
  roomStatus: string;
  cleaningStatus: string;
  maintenanceStatus: string;
  assignee: string;
};

export const EMPTY_OPERATIONS_FILTERS: OperationsFilterState = {
  building: "",
  roomStatus: "",
  cleaningStatus: "",
  maintenanceStatus: "",
  assignee: "",
};

export default function OperationsFilters({
  value,
  onChange,
  buildings,
  assignees,
}: {
  value: OperationsFilterState;
  onChange: (v: OperationsFilterState) => void;
  buildings: BuildingOption[];
  assignees: AssigneeOption[];
}) {
  const set = (patch: Partial<OperationsFilterState>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select
        aria-label="Корпус"
        value={value.building}
        onChange={(e) => set({ building: e.target.value })}
      >
        <option value="">Все корпуса</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Статус номера"
        value={value.roomStatus}
        onChange={(e) => set({ roomStatus: e.target.value })}
      >
        <option value="">Все статусы номера</option>
        {SUMMARY_CARD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ROOM_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Статус уборки"
        value={value.cleaningStatus}
        onChange={(e) => set({ cleaningStatus: e.target.value })}
      >
        <option value="">Все статусы уборки</option>
        {CLEANING_TASK_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {CLEANING_TASK_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Статус ремонта"
        value={value.maintenanceStatus}
        onChange={(e) => set({ maintenanceStatus: e.target.value })}
      >
        <option value="">Все статусы ремонта</option>
        {MAINTENANCE_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {MAINTENANCE_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Исполнитель"
        value={value.assignee}
        onChange={(e) => set({ assignee: e.target.value })}
      >
        <option value="">Все исполнители</option>
        {assignees.map((a) => (
          <option key={a.id} value={a.id}>
            {a.fullName}
          </option>
        ))}
      </Select>
    </div>
  );
}
