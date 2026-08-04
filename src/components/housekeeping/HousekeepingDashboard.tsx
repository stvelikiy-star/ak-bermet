"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CLEANING_PHOTO_MIME_TYPES,
  MAX_CLEANING_PHOTO_BYTES,
  canPerformHousekeepingAction,
  getHousekeepingPriority,
  isValidProblemNote,
  type HousekeepingAction,
} from "@/lib/housekeeping-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { HousekeepingTask } from "@/types/housekeeping";
import type { CleaningTaskStatus } from "@/types/operations";

const STATUS_LABELS: Record<CleaningTaskStatus, string> = {
  pending: "Назначена",
  accepted: "Принята",
  in_progress: "Уборка идёт",
  problem_reported: "Проблема передана",
  done: "Завершена",
  cancelled: "Отменена",
};

const STATUS_STYLES: Record<CleaningTaskStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-sky-50 text-sky-800 ring-sky-200",
  in_progress: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  problem_reported: "bg-red-50 text-red-800 ring-red-200",
  done: "bg-slate-100 text-slate-700 ring-slate-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

const PRIORITY = {
  overdue: { label: "Просрочено", className: "bg-red-600 text-white" },
  high: { label: "Срочно", className: "bg-orange-100 text-orange-800" },
  normal: { label: "Планово", className: "bg-gold/15 text-emerald-deep" },
  low: { label: "Без срока", className: "bg-slate-100 text-slate-600" },
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function HousekeepingDashboard({
  staffName,
}: {
  staffName: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [problemTask, setProblemTask] = useState<HousekeepingTask | null>(null);
  const [problemNote, setProblemNote] = useState("");
  const [blocksRoom, setBlocksRoom] = useState(false);
  const [photoTask, setPhotoTask] = useState<HousekeepingTask | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPhase, setPhotoPhase] = useState<"before" | "after">("before");
  const pendingTasks = useRef(new Set<string>());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    setUnavailable(false);
    try {
      const response = await fetch("/api/housekeeping/tasks", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        router.replace("/staff/login?from=/housekeeping");
        return;
      }
      if (response.status === 403) {
        router.replace("/staff/unauthorized");
        return;
      }
      if (!response.ok) {
        setUnavailable(response.status === 503);
        setError(await responseMessage(response, "Сервис задач временно недоступен."));
        return false;
      }
      const payload = (await response.json()) as { tasks: HousekeepingTask[] };
      setTasks(payload.tasks);
      return true;
    } catch {
      setUnavailable(true);
      setError("Нет связи с сервисом задач. Проверьте интернет и повторите.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const activeCount = useMemo(
    () =>
      tasks.filter((task) =>
        ["pending", "accepted", "in_progress"].includes(task.status)
      ).length,
    [tasks]
  );

  async function runAction(
    task: HousekeepingTask,
    action: HousekeepingAction,
    details?: { note: string; blocksRoom: boolean }
  ) {
    if (pendingTasks.current.has(task.id)) return;
    if (!canPerformHousekeepingAction(task.status, action)) {
      setError("Статус задачи изменился. Обновите список.");
      return;
    }
    pendingTasks.current.add(task.id);
    setBusyTask(task.id);
    setError("");
    setUnavailable(false);
    try {
      const response = await fetch("/api/housekeeping/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action, ...details }),
      });
      if (response.status === 401) {
        router.replace("/staff/login?from=/housekeeping");
        return;
      }
      if (response.status === 403) {
        setError(await responseMessage(response, "Задача больше не назначена вам."));
        await loadTasks();
        return;
      }
      if (!response.ok) {
        setUnavailable(response.status === 503);
        setError(await responseMessage(response, "Не удалось изменить задачу."));
        return;
      }
      setProblemTask(null);
      setProblemNote("");
      setBlocksRoom(false);
      await loadTasks();
    } catch {
      setUnavailable(true);
      setError("Нет связи с сервисом задач. Изменение не подтверждено.");
    } finally {
      pendingTasks.current.delete(task.id);
      setBusyTask(null);
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

  async function recordPhoto() {
    if (!photoTask || !photoFile) return;
    const taskId = photoTask.id;
    if (pendingTasks.current.has(taskId)) return;
    pendingTasks.current.add(taskId);
    setBusyTask(taskId);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setUnavailable(true);
        setError("Хранилище фотографий не настроено.");
        return;
      }
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/staff/login?from=/housekeeping");
        return;
      }
      const extension = photoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `${userData.user.id}/${photoTask.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) {
        setError("Не удалось загрузить фотографию. Повторите попытку.");
        return;
      }
      const response = await fetch("/api/housekeeping/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: photoTask.id, action: "record_attachment", storagePath, phase: photoPhase }),
      });
      if (!response.ok) {
        await supabase.storage.from("task-attachments").remove([storagePath]);
        setError(await responseMessage(response, "Не удалось сохранить фотографию."));
        return;
      }
      setPhotoTask(null);
      setPhotoFile(null);
      await loadTasks();
    } catch {
      // The upload or API request may have completed before the connection
      // failed. Do not delete an object that the server may already reference.
      const refreshed = await loadTasks();
      setUnavailable(!refreshed);
      setError(
        refreshed
          ? "Нет связи с сервисом задач. Фотография не подтверждена. Список обновлён; проверьте наличие фото перед повтором."
          : "Нет связи с сервисом задач. Фотография не подтверждена. Не удалось обновить список; сохранены ранее загруженные задачи. Проверьте связь перед повтором."
      );
    } finally {
      pendingTasks.current.delete(taskId);
      setBusyTask(null);
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 border-b border-gold/20 bg-emerald-deep text-white shadow-soft">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider2 text-gold-soft">
              AK BERMET · Уборка
            </p>
            <h1 className="truncate font-display text-xl font-semibold">
              Мои задачи
            </h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white"
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <section className="mb-5 rounded-2xl bg-milk p-4 shadow-soft ring-1 ring-gold/15">
          <p className="truncate text-sm font-semibold text-emerald-deep">
            {staffName}
          </p>
          <p className="mt-1 text-xs text-muted">
            Активных задач: {loading ? "…" : activeCount}
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {unavailable && (
              <p className="mb-1 font-semibold">Сервис уборки недоступен</p>
            )}
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="mt-3 font-semibold underline underline-offset-2"
            >
              Повторить
            </button>
          </div>
        )}

        {loading ? (
          <div aria-live="polite" className="space-y-3">
            <p className="sr-only">Загрузка задач</p>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-2xl bg-milk shadow-soft ring-1 ring-gold/10"
              />
            ))}
          </div>
        ) : tasks.length === 0 && !error ? (
          <section className="rounded-2xl bg-milk px-6 py-12 text-center shadow-soft ring-1 ring-gold/15">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-deep/5 text-2xl">
              ✓
            </div>
            <h2 className="font-display text-xl font-semibold text-emerald-deep">
              Назначенных задач нет
            </h2>
            <p className="mt-2 text-sm text-muted">
              Новые задачи появятся здесь после назначения менеджером.
            </p>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="mt-5 rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-emerald-deep"
            >
              Обновить
            </button>
          </section>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={unavailable || busyTask === task.id}
                onAction={(action) => void runAction(task, action)}
                onReport={() => {
                  setProblemTask(task);
                  setProblemNote("");
                  setBlocksRoom(false);
                }}
                onPhoto={(phase) => {
                  setPhotoTask(task);
                  setPhotoPhase(phase);
                  setPhotoFile(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {problemTask && (
        <ProblemDialog
          task={problemTask}
          note={problemNote}
          blocksRoom={blocksRoom}
          busy={busyTask === problemTask.id}
          onNote={setProblemNote}
          onBlocksRoom={setBlocksRoom}
          onClose={() => setProblemTask(null)}
          onSubmit={() =>
            void runAction(problemTask, "report_problem", {
              note: problemNote.trim(),
              blocksRoom,
            })
          }
        />
      )}
      {photoTask && (
        <PhotoDialog task={photoTask} phase={photoPhase} file={photoFile}
          busy={busyTask === photoTask.id} onFile={setPhotoFile}
          onClose={() => setPhotoTask(null)} onSubmit={() => void recordPhoto()} />
      )}
    </main>
  );
}

function TaskCard({
  task,
  busy,
  onAction,
  onReport,
  onPhoto,
}: {
  task: HousekeepingTask;
  busy: boolean;
  onAction: (action: HousekeepingAction) => void;
  onReport: () => void;
  onPhoto: (phase: "before" | "after") => void;
}) {
  const priority = PRIORITY[getHousekeepingPriority(task.dueBy)];
  const primaryAction =
    task.status === "pending"
      ? ({ action: "accept", label: "Принять задачу" } as const)
      : task.status === "accepted"
        ? ({ action: "start", label: "Начать уборку" } as const)
        : task.status === "in_progress"
          ? ({ action: "complete", label: "Завершить уборку" } as const)
          : null;

  return (
    <article className="overflow-hidden rounded-2xl bg-milk shadow-card ring-1 ring-gold/15">
      <div className="flex items-start justify-between gap-3 border-b border-gold/10 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {task.taskNumber}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-emerald-deep">
            Комната {task.roomNumber}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {task.buildingName ?? "Корпус не указан"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.className}`}>
            {priority.label}
          </span>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3 text-sm">
        <p>
          <span className="text-muted">Срок: </span>
          <span className="font-medium text-ink">
            {task.dueBy ? formatDate(task.dueBy) : "не указан"}
          </span>
        </p>
        <p>
          <span className="text-muted">После уборки: </span>
          <span className="font-medium text-ink">
            {task.requiresInspection ? "нужна проверка" : "комната будет готова"}
          </span>
        </p>
        {task.reportedProblem && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
            <span className="font-semibold">Заметка о проблеме: </span>
            {task.reportedProblem}
          </div>
        )}
        {task.attachments.map((photo) => (
          <p key={photo.id} className="break-all rounded-lg bg-beige p-2 text-xs text-muted">
            <span className="font-semibold text-ink">Фото {photo.phase === "before" ? "до" : "после"}: </span>{photo.storagePath}
          </p>
        ))}
      </div>

      {(primaryAction ||
        canPerformHousekeepingAction(task.status, "report_problem") ||
        task.status === "problem_reported") && (
        <div className="grid gap-2 border-t border-gold/10 p-4 sm:grid-cols-2">
          {primaryAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(primaryAction.action)}
              className="min-h-12 rounded-xl bg-emerald-deep px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Сохраняем…" : primaryAction.label}
            </button>
          )}
          {canPerformHousekeepingAction(task.status, "report_problem") && (
            <button
              type="button"
              disabled={busy}
              onClick={onReport}
              className="min-h-12 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Сообщить о проблеме
            </button>
          )}
          {(["pending", "accepted", "in_progress"] as CleaningTaskStatus[]).includes(task.status) && (
            <button type="button" disabled={busy}
              onClick={() => onPhoto("before")}
              className="min-h-12 rounded-xl border border-gold/40 bg-white px-4 py-3 text-sm font-semibold text-emerald-deep disabled:opacity-50">
              Добавить фото до
            </button>
          )}
          {(task.status === "in_progress" || task.status === "problem_reported") && (
            <button type="button" disabled={busy} onClick={() => onPhoto("after")}
              className="min-h-12 rounded-xl border border-gold/40 bg-white px-4 py-3 text-sm font-semibold text-emerald-deep disabled:opacity-50">
              Добавить фото после
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PhotoDialog({ task, phase, file, busy, onFile, onClose, onSubmit }: {
  task: HousekeepingTask; phase: "before" | "after"; file: File | null; busy: boolean;
  onFile: (value: File | null) => void; onClose: () => void; onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="photo-title" className="w-full rounded-t-3xl bg-milk p-5 shadow-float sm:max-w-lg sm:rounded-3xl">
        <h2 id="photo-title" className="font-display text-2xl font-semibold text-emerald-deep">Фото {phase === "before" ? "до" : "после"} · комната {task.roomNumber}</h2>
        <label className="mt-5 block text-sm font-semibold text-ink">Сделать или выбрать фотографию
          <input autoFocus type="file" accept={CLEANING_PHOTO_MIME_TYPES.join(",")}
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-xl border border-gold/30 bg-white px-4 py-3 text-sm" />
        </label>
        <p className="mt-2 text-xs text-muted">JPEG, PNG, WebP, HEIC или HEIF, не более 10 МБ.</p>
        {file && <p className="mt-2 break-all text-xs text-ink">{file.name}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-12 rounded-xl border border-gold/30 font-semibold text-emerald-deep">Отмена</button>
          <button type="button" disabled={busy || !file || !(CLEANING_PHOTO_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase()) || file.size <= 0 || file.size > MAX_CLEANING_PHOTO_BYTES} onClick={onSubmit} className="min-h-12 rounded-xl bg-emerald-deep font-semibold text-white disabled:opacity-50">{busy ? "Загружаем…" : "Загрузить"}</button>
        </div>
      </div>
    </div>
  );
}

function ProblemDialog({
  task,
  note,
  blocksRoom,
  busy,
  onNote,
  onBlocksRoom,
  onClose,
  onSubmit,
}: {
  task: HousekeepingTask;
  note: string;
  blocksRoom: boolean;
  busy: boolean;
  onNote: (value: string) => void;
  onBlocksRoom: (value: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-title"
        className="w-full rounded-t-3xl bg-milk p-5 shadow-float sm:max-w-lg sm:rounded-3xl"
      >
        <h2 id="problem-title" className="font-display text-2xl font-semibold text-emerald-deep">
          Проблема в комнате {task.roomNumber}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Заявка будет передана администратору и технической службе.
        </p>
        <label htmlFor="problem-note" className="mt-5 block text-sm font-semibold text-ink">
          Что обнаружено?
        </label>
        <textarea
          id="problem-note"
          autoFocus
          rows={4}
          maxLength={1000}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Например: протекает кран в ванной"
          className="mt-2 w-full resize-none rounded-xl border border-gold/30 bg-white px-4 py-3 text-base text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <label className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <input
            type="checkbox"
            checked={blocksRoom}
            onChange={(event) => onBlocksRoom(event.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>
            <strong className="block">Комнату нельзя использовать</strong>
            Отметьте, если проблема блокирует заселение.
          </span>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-gold/30 px-4 py-3 text-sm font-semibold text-emerald-deep disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy || !isValidProblemNote(note)}
            onClick={onSubmit}
            className="min-h-12 rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Отправляем…" : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
