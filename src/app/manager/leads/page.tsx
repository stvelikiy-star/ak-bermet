"use client";

import { useEffect, useMemo, useState } from "react";
import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerFilters, {
  type LeadFilterState,
} from "@/components/manager/ManagerFilters";
import LeadTable from "@/components/manager/LeadTable";
import LeadCard from "@/components/manager/LeadCard";
import LeadStatusBadge from "@/components/manager/LeadStatusBadge";
import type { ManagerLead } from "@/types/manager";
import type { LeadStatus } from "@/types/lead";
import {
  STATUS_ORDER,
  STATUS_LABELS,
  INTEREST_LABELS,
  SOURCE_LABELS,
  formatDate,
  leadDates,
  leadGuests,
  managerWhatsAppUrl,
} from "@/lib/manager-utils";
import { Select, TextArea } from "@/components/forms/fields";
import { IconClose, IconWhatsApp } from "@/components/ui/icons";

const EMPTY: LeadFilterState = { status: "", interest: "", source: "", query: "" };

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ManagerLeadsPage() {
  const [leads, setLeads] = useState<ManagerLead[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<LeadFilterState>(EMPTY);
  const [selected, setSelected] = useState<ManagerLead | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/manager/leads");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.configured === false) setConfigured(false);
          throw new Error(data.message || "Не удалось загрузить заявки.");
        }
        if (active) {
          setLeads(data.items ?? []);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Не удалось загрузить заявки."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filters.status && l.status !== filters.status) return false;
      if (filters.interest && l.interest !== filters.interest) return false;
      if (filters.source && l.source !== filters.source) return false;
      if (q && !`${l.name} ${l.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, filters]);

  const open = (lead: ManagerLead) => {
    setSelected(lead);
    setSave("idle");
    setSaveError("");
  };

  const patchDraft = (patch: Partial<ManagerLead>) =>
    setSelected((s) => (s ? { ...s, ...patch } : s));

  const onSave = async () => {
    if (!selected) return;
    setSave("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/manager/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selected.status,
          managerComment: selected.managerComment ?? "",
          expectedUpdatedAt: selected.updatedAt ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Не удалось сохранить изменения.");
      }
      const saved = { ...selected, updatedAt: data.updatedAt as string };
      setLeads((prev) =>
        prev.map((l) => (l.id === selected.id ? saved : l))
      );
      setSelected(saved);
      setSave("saved");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Не удалось сохранить изменения."
      );
      setSave("error");
    }
  };

  return (
    <>
      <ManagerHeader title="Заявки" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Изменения сохраняются в подключённом источнике заявок. Если запись
            уже изменил другой сотрудник, сохранение будет отклонено.
          </div>
          {!configured && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
              Источник не настроен
            </span>
          )}
        </div>

        <ManagerFilters value={filters} onChange={setFilters} />

        {loading ? (
          <p className="py-10 text-center text-muted">Загрузка заявок…</p>
        ) : loadError ? (
          <p className="py-10 text-center text-red-600">{loadError}</p>
        ) : (
          <>
            <p className="text-sm text-muted">Найдено: {filtered.length}</p>
            <div className="hidden lg:block">
              <LeadTable leads={filtered} onOpen={open} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
              {filtered.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onOpen={open} />
              ))}
            </div>
          </>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-float">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-emerald-deep">
                  {selected.name}
                </h2>
                <p className="text-sm text-muted">{selected.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Закрыть"
                className="text-muted hover:text-emerald-deep"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3">
              <LeadStatusBadge status={selected.status} />
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <Row label="ID" value={selected.id} />
              <Row label="Создана" value={formatDate(selected.createdAt)} />
              <Row label="Источник" value={SOURCE_LABELS[selected.source] ?? selected.source} />
              <Row label="Направление" value={INTEREST_LABELS[selected.interest] ?? selected.interest} />
              <Row label="Даты" value={leadDates(selected)} />
              <Row label="Гости" value={leadGuests(selected)} />
              {selected.childrenAges && (
                <Row label="Возраст детей" value={selected.childrenAges} />
              )}
              {selected.roomCategory && (
                <Row label="Категория" value={selected.roomCategory} />
              )}
              {selected.eventType && (
                <Row label="Мероприятие" value={selected.eventType} />
              )}
              {selected.hallSize && <Row label="Зал" value={selected.hallSize} />}
              {selected.spaService && (
                <Row label="Услуга" value={selected.spaService} />
              )}
              {selected.message && <Row label="Сообщение" value={selected.message} />}
            </dl>

            <div className="mt-6 space-y-3 border-t border-gold/15 pt-5">
              <label className="block text-sm font-medium text-emerald-deep">
                Статус
              </label>
              <Select
                value={selected.status}
                onChange={(e) => {
                  patchDraft({ status: e.target.value as LeadStatus });
                  setSave("idle");
                }}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>

              <label className="block text-sm font-medium text-emerald-deep">
                Комментарий менеджера
              </label>
              <TextArea
                value={selected.managerComment ?? ""}
                onChange={(e) => {
                  patchDraft({ managerComment: e.target.value });
                  setSave("idle");
                }}
                placeholder="Например: клиенту отправили условия, ждём чек предоплаты."
              />

              <button
                type="button"
                onClick={onSave}
                disabled={save === "saving"}
                className="w-full rounded-full bg-emerald-deep px-5 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800 disabled:opacity-60"
              >
                {save === "saving" ? "Сохраняем…" : "Сохранить изменения"}
              </button>

              {save === "saved" && (
                <p className="text-sm text-emerald-700">Статус заявки обновлён.</p>
              )}
              {save === "error" && (
                <p className="text-sm text-red-600">
                  {saveError || "Не удалось сохранить изменения. Попробуйте ещё раз."}
                </p>
              )}
            </div>

            <a
              href={managerWhatsAppUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-3 text-sm font-semibold text-emerald-deep"
            >
              <IconWhatsApp className="h-4 w-4" />
              Написать клиенту
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-emerald-deep">{value}</dd>
    </div>
  );
}
