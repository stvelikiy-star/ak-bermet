"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateTechnicianAction,
  type TechnicianAction,
} from "@/lib/technician-rules";
import type { TechnicianTask } from "@/types/technician";

const STATUS = {
  reported: "Назначена",
  acknowledged: "Принята",
  in_progress: "В работе",
  on_hold: "Приостановлена",
  completed: "Работы завершены",
  closed: "Закрыта",
  cancelled: "Отменена",
} as const;
const PRIORITY = {
  low: ["Низкий", "bg-slate-100 text-slate-700"],
  normal: ["Обычный", "bg-sky-50 text-sky-800"],
  high: ["Высокий", "bg-orange-100 text-orange-800"],
  urgent: ["Срочно", "bg-red-600 text-white"],
} as const;

type FormAction =
  | "record_diagnosis"
  | "record_work"
  | "record_material"
  | "record_attachment";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function responseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function TechnicianDashboard({ staffName }: { staffName: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TechnicianTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ task: TechnicianTask; action: FormAction } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setUnavailable(false);
    try {
      const response = await fetch("/api/technician/tasks", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        router.replace("/staff/login?from=/technician");
        return;
      }
      if (response.status === 403) {
        router.replace("/staff/unauthorized");
        return;
      }
      if (!response.ok) {
        setTasks([]);
        setUnavailable(response.status === 503);
        setError(await responseError(response, "Не удалось загрузить заявки."));
        return;
      }
      const payload = (await response.json()) as { tasks: TechnicianTask[] };
      setTasks(payload.tasks);
    } catch {
      setTasks([]);
      setUnavailable(true);
      setError("Нет связи с сервисом. Проверьте интернет и повторите.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => void load(), [load]);

  const activeCount = useMemo(
    () => tasks.filter((task) => !["completed", "closed", "cancelled"].includes(task.status)).length,
    [tasks]
  );

  async function run(task: TechnicianTask, action: TechnicianAction, details = {}) {
    const invalid = validateTechnicianAction(task.status, action);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(task.id);
    setError("");
    setUnavailable(false);
    try {
      const response = await fetch("/api/technician/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action, ...details }),
      });
      if (response.status === 401) {
        router.replace("/staff/login?from=/technician");
        return;
      }
      if (response.status === 403) {
        setError(await responseError(response, "Заявка больше не назначена вам."));
        await load();
        return;
      }
      if (!response.ok) {
        setUnavailable(response.status === 503);
        setError(await responseError(response, "Изменение не подтверждено."));
        return;
      }
      setForm(null);
      await load();
    } catch {
      setUnavailable(true);
      setError("Нет связи с сервисом. Изменение не подтверждено.");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/staff/logout", { method: "POST" });
    } finally {
      router.replace("/staff/login");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 border-b border-gold/20 bg-emerald-deep text-white shadow-soft">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider2 text-gold-soft">
              AK BERMET · Техслужба
            </p>
            <h1 className="font-display text-xl font-semibold">Мои заявки</h1>
          </div>
          <button onClick={logout} className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold">
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <section className="mb-5 rounded-2xl bg-milk p-4 shadow-soft ring-1 ring-gold/15">
          <p className="truncate text-sm font-semibold text-emerald-deep">{staffName}</p>
          <p className="mt-1 text-xs text-muted">Активных заявок: {loading ? "…" : activeCount}</p>
        </section>

        {error && (
          <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {unavailable && <p className="mb-1 font-semibold">Сервис техслужбы недоступен</p>}
            <p>{error}</p>
            <button onClick={() => void load()} className="mt-3 font-semibold underline">Повторить</button>
          </div>
        )}

        {loading ? (
          <div aria-live="polite" className="space-y-4">
            <span className="sr-only">Загрузка заявок</span>
            {[1, 2, 3].map((n) => <div key={n} className="h-72 animate-pulse rounded-2xl bg-milk shadow-soft" />)}
          </div>
        ) : tasks.length === 0 && !error ? (
          <section className="rounded-2xl bg-milk px-6 py-12 text-center shadow-soft ring-1 ring-gold/15">
            <div className="text-3xl">✓</div>
            <h2 className="mt-3 font-display text-xl font-semibold text-emerald-deep">Назначенных заявок нет</h2>
            <p className="mt-2 text-sm text-muted">Новые заявки появятся после назначения менеджером.</p>
            <button onClick={() => void load()} className="mt-5 rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-emerald-deep">Обновить</button>
          </section>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busy === task.id || unavailable}
                onRun={(action) => void run(task, action)}
                onForm={(action) => setForm({ task, action })}
              />
            ))}
          </div>
        )}
      </div>

      {form && (
        <ActionForm
          task={form.task}
          action={form.action}
          busy={busy === form.task.id}
          onClose={() => setForm(null)}
          onSubmit={(details) => void run(form.task, form.action, details)}
        />
      )}
    </main>
  );
}

function TaskCard({
  task,
  busy,
  onRun,
  onForm,
}: {
  task: TechnicianTask;
  busy: boolean;
  onRun: (action: TechnicianAction) => void;
  onForm: (action: FormAction) => void;
}) {
  const can = (action: TechnicianAction) =>
    validateTechnicianAction(task.status, action) === null;
  const repairStarted = task.workLogs.some(
    (log) => log.logType === "note" && log.description === "Repair started"
  );
  return (
    <article className="rounded-2xl bg-milk p-4 shadow-soft ring-1 ring-gold/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">{task.requestNumber}</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-emerald-deep">
            Комната {task.roomNumber}
          </h2>
          <p className="text-xs text-muted">{task.buildingName ?? "Корпус не указан"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY[task.priority][1]}`}>
            {PRIORITY[task.priority][0]}
          </span>
          <span className="rounded-full bg-emerald-deep/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-deep">
            {STATUS[task.status]}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-beige/70 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Проблема</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{task.description}</p>
        {task.diagnosis && <p className="mt-3 border-t border-gold/20 pt-3 text-sm"><b>Диагностика:</b> {task.diagnosis}</p>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-muted">Создана</dt><dd className="mt-1 font-medium">{formatDate(task.createdAt)}</dd></div>
        <div><dt className="text-muted">Целевой срок</dt><dd className="mt-1 font-medium">Не задан схемой</dd></div>
      </dl>

      {task.attachments.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-emerald-deep">Фотографии ({task.attachments.length})</p>
          <ul className="mt-2 space-y-2">
            {task.attachments.map((photo) => (
              <li key={photo.id} className="break-all rounded-lg bg-beige px-3 py-2 text-xs">
                <span className="font-semibold">{photo.phase === "result" ? "Результат" : photo.phase === "diagnostic" ? "Диагностика" : "Вложение"}:</span>{" "}
                {photo.storagePath}
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.workLogs.length > 0 && (
        <details className="mt-4 rounded-xl border border-gold/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-emerald-deep">
            Журнал работ ({task.workLogs.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {task.workLogs.map((log) => (
              <li key={log.id} className="text-xs text-ink">
                <span className="text-muted">{formatDate(log.loggedAt)} · </span>
                {log.materialName
                  ? `${log.materialName}: ${log.quantity ?? ""} ${log.unit ?? ""}`
                  : log.description ?? log.logType}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {can("accept") && <ActionButton busy={busy} onClick={() => onRun("accept")}>Принять заявку</ActionButton>}
        {can("start_diagnostics") && <ActionButton busy={busy} onClick={() => onRun("start_diagnostics")}>Начать диагностику</ActionButton>}
        {can("record_diagnosis") && <ActionButton secondary busy={busy} onClick={() => onForm("record_diagnosis")}>Записать результат диагностики</ActionButton>}
        {can("start_repair") && Boolean(task.diagnosis) && !repairStarted && <ActionButton busy={busy} onClick={() => onRun("start_repair")}>Начать ремонт</ActionButton>}
        {can("record_work") && <ActionButton secondary busy={busy} onClick={() => onForm("record_work")}>Записать выполненную работу</ActionButton>}
        {can("record_material") && <ActionButton secondary busy={busy} onClick={() => onForm("record_material")}>Добавить материал</ActionButton>}
        {can("record_attachment") && <ActionButton secondary busy={busy} onClick={() => onForm("record_attachment")}>Записать путь фотографии</ActionButton>}
        {can("complete") && <ActionButton busy={busy} onClick={() => onRun("complete")}>Завершить ремонт</ActionButton>}
      </div>
    </article>
  );
}

function ActionButton({ children, busy, secondary, onClick }: { children: React.ReactNode; busy: boolean; secondary?: boolean; onClick: () => void }) {
  return <button disabled={busy} onClick={onClick} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${secondary ? "border border-gold/40 text-emerald-deep" : "bg-emerald-deep text-white"}`}>{busy ? "Подождите…" : children}</button>;
}

function ActionForm({ task, action, busy, onClose, onSubmit }: { task: TechnicianTask; action: FormAction; busy: boolean; onClose: () => void; onSubmit: (details: Record<string, unknown>) => void }) {
  const [description, setDescription] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [phase, setPhase] = useState<"diagnostic" | "result">("diagnostic");
  const title = action === "record_diagnosis" ? "Результат диагностики" : action === "record_work" ? "Выполненная работа" : action === "record_material" ? "Использованный материал" : "Фотография";
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (action === "record_material") onSubmit({ materialName, quantity: Number(quantity), unit, description });
    else if (action === "record_attachment") onSubmit({ storagePath, phase });
    else onSubmit({ description });
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center" role="presentation">
      <form onSubmit={submit} className="w-full rounded-t-3xl bg-milk p-5 shadow-xl sm:max-w-lg sm:rounded-3xl">
        <h2 className="font-display text-xl font-semibold text-emerald-deep">{title}</h2>
        <p className="mt-1 text-xs text-muted">{task.requestNumber} · комната {task.roomNumber}</p>
        <div className="mt-4 space-y-3">
          {action === "record_material" && <>
            <Field label="Материал" value={materialName} onChange={setMaterialName} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Количество" value={quantity} onChange={setQuantity} type="number" />
              <Field label="Единица" value={unit} onChange={setUnit} />
            </div>
          </>}
          {action === "record_attachment" ? <>
            <label className="block text-sm font-medium">Тип
              <select value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)} className="mt-1 w-full rounded-xl border border-gold/30 bg-white px-3 py-3">
                <option value="diagnostic">Диагностическая</option>
                <option value="result">Результат ремонта</option>
              </select>
            </label>
            <Field label="Путь объекта в Supabase Storage" value={storagePath} onChange={setStoragePath} placeholder="maintenance/…/photo.jpg" />
            <p className="text-xs text-muted">Репозиторий не определяет bucket или upload API; здесь сохраняется существующий storage_path по контракту task_attachments.</p>
          </> : (
            <label className="block text-sm font-medium">{action === "record_material" ? "Примечание (необязательно)" : "Описание"}
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-gold/30 bg-white px-3 py-3" />
            </label>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl border border-gold/40 font-semibold text-emerald-deep">Отмена</button>
          <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-emerald-deep font-semibold text-white disabled:opacity-50">{busy ? "Сохранение…" : "Сохранить"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-sm font-medium">{label}<input type={type} min={type === "number" ? "0.01" : undefined} step={type === "number" ? "0.01" : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-gold/30 bg-white px-3 py-3" /></label>;
}
