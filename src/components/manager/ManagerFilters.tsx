"use client";

import { Select, TextInput } from "@/components/forms/fields";
import { STATUS_ORDER, STATUS_LABELS, INTEREST_LABELS, SOURCE_LABELS } from "@/lib/manager-utils";

export type LeadFilterState = {
  status: string;
  interest: string;
  source: string;
  query: string;
};

export default function ManagerFilters({
  value,
  onChange,
}: {
  value: LeadFilterState;
  onChange: (v: LeadFilterState) => void;
}) {
  const set = (patch: Partial<LeadFilterState>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        aria-label="Статус"
        value={value.status}
        onChange={(e) => set({ status: e.target.value })}
      >
        <option value="">Все статусы</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Интерес"
        value={value.interest}
        onChange={(e) => set({ interest: e.target.value })}
      >
        <option value="">Все направления</option>
        {Object.entries(INTEREST_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Источник"
        value={value.source}
        onChange={(e) => set({ source: e.target.value })}
      >
        <option value="">Все источники</option>
        {Object.entries(SOURCE_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>

      <TextInput
        aria-label="Поиск"
        placeholder="Поиск по имени или телефону"
        value={value.query}
        onChange={(e) => set({ query: e.target.value })}
      />
    </div>
  );
}
