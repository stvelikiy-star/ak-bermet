"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface SiteContentEditorField {
  key: string;
  section: string;
  label: string;
  multiline?: boolean;
  fallbacks: Record<string, string>;
}

export interface SiteContentDraftRow {
  content_key: string;
  locale: string;
  draft_value: string;
  version: number;
  updated_at: string;
}

export interface SiteContentPublishedRow {
  content_key: string;
  locale: string;
  published_value: string;
  version: number;
  published_at: string;
}

export interface SiteContentHistoryRow {
  id: string;
  content_key: string;
  locale: string;
  version: number;
  action: string;
  value: string | null;
  created_at: string;
}

interface Props {
  fields: readonly SiteContentEditorField[];
  drafts: readonly SiteContentDraftRow[];
  published: readonly SiteContentPublishedRow[];
  history: readonly SiteContentHistoryRow[];
  canEdit: boolean;
  storageReady: boolean;
}

const LOCALES = [
  { code: "ru", label: "RU" },
  { code: "kg", label: "KG" },
  { code: "en", label: "EN" },
  { code: "kz", label: "KZ" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  draft_saved: "Черновик сохранён",
  published: "Опубликовано",
  restored: "Версия восстановлена",
  unpublished: "Снято с публикации",
};

function keyOf(contentKey: string, locale: string) {
  return `${contentKey}::${locale}`;
}

function shortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bishkek",
  }).format(date);
}

export default function SiteContentEditor({ fields, drafts, published, history, canEdit, storageReady }: Props) {
  const router = useRouter();
  const [locale, setLocale] = useState("ru");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const draftMap = useMemo(
    () => new Map(drafts.map((row) => [keyOf(row.content_key, row.locale), row])),
    [drafts],
  );
  const publishedMap = useMemo(
    () => new Map(published.map((row) => [keyOf(row.content_key, row.locale), row])),
    [published],
  );
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      for (const item of LOCALES) {
        const mapKey = keyOf(field.key, item.code);
        next[mapKey] = draftMap.get(mapKey)?.draft_value ?? field.fallbacks[item.code] ?? "";
      }
    }
    setValues(next);
  }, [draftMap, fields]);

  const sections = useMemo(() => {
    const grouped = new Map<string, SiteContentEditorField[]>();
    for (const field of fields) {
      const list = grouped.get(field.section) ?? [];
      list.push(field);
      grouped.set(field.section, list);
    }
    return [...grouped.entries()];
  }, [fields]);

  async function mutate(payload: Record<string, unknown>, actionKey: string, success: string) {
    if (busy || !storageReady || !canEdit) return;
    setBusy(actionKey);
    setMessage(null);
    try {
      const response = await fetch("/api/manager/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; code?: string };
      if (!response.ok || !result.ok) {
        setMessage({ kind: "error", text: `Не удалось выполнить действие: ${result.code ?? "CONTENT_WRITE_FAILED"}.` });
        return;
      }
      setMessage({ kind: "ok", text: success });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Связь с CRM прервана. Повторите действие после восстановления соединения." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
        <div>
          <p className="text-sm font-semibold text-emerald-deep">Язык редактирования</p>
          <p className="mt-1 text-xs text-muted">Публикация выполняется отдельно для каждого языка.</p>
        </div>
        <div className="flex gap-2">
          {LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLocale(item.code)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${locale === item.code ? "bg-emerald-deep text-white" : "border border-gold/20 bg-white text-emerald-deep"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!storageReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          CMS-хранилище ещё не применено к этой среде. Показан текущий кодовый fallback; изменения заблокированы до миграции.
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          Режим просмотра. Редактировать и публиковать контент могут только Owner и Administrator.
        </div>
      ) : null}

      {message ? (
        <div className={`rounded-xl p-4 text-sm ${message.kind === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-rose-200 bg-rose-50 text-rose-900"}`}>
          {message.text}
        </div>
      ) : null}

      {sections.map(([section, sectionFields]) => (
        <section key={section} className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft lg:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-deep">{section}</h2>
              <p className="mt-1 text-xs text-muted">Черновик не влияет на публичный сайт до нажатия «Опубликовать».</p>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="text-xs font-semibold text-gold-dark hover:underline">
              Открыть публичный сайт ↗
            </a>
          </div>

          <div className="space-y-5">
            {sectionFields.map((field) => {
              const mapKey = keyOf(field.key, locale);
              const draft = draftMap.get(mapKey);
              const live = publishedMap.get(mapKey);
              const fallback = field.fallbacks[locale] ?? "";
              const value = values[mapKey] ?? fallback;
              const savedDraftValue = draft?.draft_value ?? fallback;
              const hasUnsavedChanges = value !== savedDraftValue;
              const isBusy = busy?.startsWith(mapKey) ?? false;
              const rowHistory = history.filter((item) => item.content_key === field.key && item.locale === locale).slice(0, 6);

              return (
                <article key={field.key} className="rounded-xl border border-gold/10 bg-cream/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-deep">{field.label}</h3>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">{field.key}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded-full bg-white px-2 py-1 text-muted ring-1 ring-gold/15">draft v{draft?.version ?? 0}</span>
                      <span className={`rounded-full px-2 py-1 ring-1 ${live ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-white text-muted ring-gold/15"}`}>
                        {live ? `published v${live.version}` : "fallback active"}
                      </span>
                      {hasUnsavedChanges ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800 ring-1 ring-amber-200">есть несохранённые изменения</span>
                      ) : null}
                    </div>
                  </div>

                  {field.multiline ? (
                    <textarea
                      value={value}
                      disabled={!canEdit || !storageReady || isBusy}
                      onChange={(event) => setValues((current) => ({ ...current, [mapKey]: event.target.value }))}
                      maxLength={20000}
                      rows={4}
                      className="mt-3 w-full rounded-lg border border-gold/20 bg-white px-3 py-2 text-sm leading-relaxed text-emerald-deep disabled:bg-gray-50 disabled:text-muted"
                    />
                  ) : (
                    <input
                      value={value}
                      disabled={!canEdit || !storageReady || isBusy}
                      onChange={(event) => setValues((current) => ({ ...current, [mapKey]: event.target.value }))}
                      maxLength={20000}
                      className="mt-3 w-full rounded-lg border border-gold/20 bg-white px-3 py-2 text-sm text-emerald-deep disabled:bg-gray-50 disabled:text-muted"
                    />
                  )}

                  <div className="mt-3 rounded-lg border border-dashed border-gold/20 bg-white/70 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Предпросмотр текста</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-emerald-deep">{value || "— пусто —"}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          disabled={!storageReady || Boolean(busy) || (Boolean(draft) && !hasUnsavedChanges)}
                          onClick={() => mutate({ action: "save", contentKey: field.key, locale, value }, `${mapKey}:save`, "Черновик сохранён.")}
                          className="rounded-lg border border-gold/30 bg-white px-3 py-2 text-xs font-semibold text-emerald-deep disabled:opacity-50"
                        >
                          Сохранить черновик
                        </button>
                        <button
                          type="button"
                          disabled={!storageReady || Boolean(busy) || !draft || !draft.draft_value.trim() || hasUnsavedChanges}
                          onClick={() => mutate({ action: "publish", contentKey: field.key, locale }, `${mapKey}:publish`, "Опубликовано. Публичный сайт обновлён.")}
                          className="rounded-lg bg-emerald-deep px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Опубликовать
                        </button>
                        <button
                          type="button"
                          disabled={!storageReady || Boolean(busy) || !live}
                          onClick={() => mutate({ action: "unpublish", contentKey: field.key, locale }, `${mapKey}:unpublish`, "Публикация снята. Сайт вернулся к кодовому fallback.")}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
                        >
                          Снять публикацию
                        </button>
                      </>
                    ) : null}
                    <span className="ml-auto text-[10px] text-muted">
                      {hasUnsavedChanges
                        ? "Сначала сохраните черновик перед публикацией или восстановлением версии"
                        : live
                          ? `Опубликовано ${shortDate(live.published_at)}`
                          : draft
                            ? `Черновик ${shortDate(draft.updated_at)}`
                            : "Изменений нет"}
                    </span>
                  </div>

                  {rowHistory.length ? (
                    <details className="mt-4 border-t border-gold/10 pt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-emerald-deep">История версий ({rowHistory.length})</summary>
                      <div className="mt-3 space-y-2">
                        {rowHistory.map((item) => (
                          <div key={item.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="font-semibold text-emerald-deep">v{item.version} · {ACTION_LABELS[item.action] ?? item.action}</span>
                              <span className="ml-2 text-muted">{shortDate(item.created_at)}</span>
                              {item.value ? <p className="mt-1 line-clamp-2 text-muted">{item.value}</p> : null}
                            </div>
                            {canEdit && item.value ? (
                              <button
                                type="button"
                                disabled={!storageReady || Boolean(busy) || hasUnsavedChanges}
                                onClick={() => mutate({ action: "restore", historyId: item.id }, `${mapKey}:restore:${item.id}`, "Версия восстановлена в черновик. Публичная версия не менялась.")}
                                className="shrink-0 rounded-lg border border-gold/20 px-3 py-1.5 font-semibold text-emerald-deep disabled:opacity-50"
                              >
                                Восстановить в черновик
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
