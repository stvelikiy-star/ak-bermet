"use client";

import { useCallback, useEffect, useState } from "react";
import type { InspectionAction } from "@/lib/inspection-rules";
import type { InspectionQueueItem } from "@/types/inspection";

const ROOM_STATUS: Record<string, string> = {
  inspection_required: "Ожидает проверки",
  maintenance_required: "Требуется ремонт",
  maintenance_in_progress: "Ремонтируется",
  blocked: "Заблокирован",
};

const TASK_STATUS: Record<string, string> = {
  done: "Уборка завершена",
  completed: "Работы завершены",
  closed: "Заявка закрыта",
};

const PHASE: Record<string, string> = {
  before: "До",
  after: "После",
  diagnostic: "Диагностика",
  result: "Результат",
  other: "Файл",
};

export default function InspectionDashboard() {
  const [items, setItems] = useState<InspectionQueueItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/manager/inspections", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить данные.");
      setItems(payload.items as InspectionQueueItem[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить данные."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(item: InspectionQueueItem, action: InspectionAction) {
    const note = notes[item.id]?.trim() ?? "";
    if (!note) {
      setError("Перед действием добавьте примечание к проверке.");
      return;
    }
    setBusy(item.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/manager/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: item.id,
          source: item.source,
          action,
          note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Операция не выполнена.");
      setNotes((current) => ({ ...current, [item.id]: "" }));
      setSuccess(
        action === "mark_blocking_problem"
          ? payload.created
            ? "Номер заблокирован, техническая заявка создана."
            : "Номер заблокирован, использована существующая техническая заявка."
          : "Результат проверки сохранён."
      );
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Операция не выполнена."
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-muted">Загрузка очереди…</p>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-gold/15 bg-white p-10 text-center text-muted shadow-soft">
          Номеров, ожидающих проверки, нет.
        </div>
      ) : (
        items.map((item) => (
          <article
            key={`${item.source}-${item.id}`}
            className="rounded-2xl border border-gold/15 bg-white p-5 shadow-soft"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  {item.buildingName ?? "Корпус не указан"}
                </p>
                <h2 className="font-display text-2xl text-emerald-deep">
                  Номер {item.roomNumber}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {item.taskNumber} · {TASK_STATUS[item.taskStatus] ?? item.taskStatus}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {ROOM_STATUS[item.roomStatus] ?? item.roomStatus}
                </span>
                <span className="rounded-full bg-cream px-3 py-1 text-xs text-muted">
                  {item.source === "cleaning" ? "После уборки" : "После ремонта"}
                </span>
                {item.activeBlockingMaintenance && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Активная блокировка
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info
                label={item.source === "cleaning" ? "Результат уборки" : "Результат ремонта"}
                value={item.resultSummary || "Результат не указан"}
              />
              <Info
                label="Сообщённые проблемы"
                value={item.reportedProblem || "Проблемы не указаны"}
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Вложения
              </p>
              {item.attachments.length === 0 ? (
                <p className="mt-1 text-sm text-muted">Нет доступных вложений.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {item.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="max-w-full rounded-lg border border-gold/15 bg-cream/40 px-3 py-2 text-xs text-muted"
                      title={attachment.storagePath}
                    >
                      {PHASE[attachment.phase] ?? attachment.phase}:{" "}
                      <span className="break-all font-mono">{attachment.storagePath}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {item.inspections.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Предыдущие проверки
                </p>
                <ul className="mt-2 space-y-2">
                  {item.inspections.map((inspection) => (
                    <li key={inspection.id} className="rounded-lg bg-cream/50 p-3 text-sm">
                      <span
                        className={
                          inspection.result === "passed"
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {inspection.result === "passed" ? "Одобрено" : "Возвращено"}
                      </span>
                      {" · "}
                      {new Date(inspection.createdAt).toLocaleString("ru-RU")}
                      {inspection.inspectorName ? ` · ${inspection.inspectorName}` : ""}
                      {inspection.notes && <p className="mt-1 text-muted">{inspection.notes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <label className="text-sm font-medium text-emerald-deep" htmlFor={`note-${item.id}`}>
                Примечание к проверке
              </label>
              <textarea
                id={`note-${item.id}`}
                value={notes[item.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                maxLength={2000}
                rows={3}
                placeholder="Что проверено, замечания или причина возврата"
                className="mt-2 w-full rounded-xl border border-gold/20 bg-white px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === item.id || item.activeBlockingMaintenance}
                onClick={() => void act(item, "approve")}
                className="rounded-xl bg-emerald-deep px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Одобрить проверку
              </button>
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() =>
                  void act(
                    item,
                    item.source === "cleaning"
                      ? "return_cleaning"
                      : "return_maintenance"
                  )
                }
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                {item.source === "cleaning"
                  ? "Вернуть на исправление уборки"
                  : "Вернуть на исправление ремонта"}
              </button>
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => void act(item, "mark_blocking_problem")}
                className="rounded-xl border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
              >
                Отметить блокирующую техпроблему
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-deep">{value}</p>
    </div>
  );
}
