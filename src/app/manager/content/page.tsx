import ManagerHeader from "@/components/manager/ManagerHeader";
import SiteContentEditor, {
  type SiteContentDraftRow,
  type SiteContentHistoryRow,
  type SiteContentPublishedRow,
} from "@/components/manager/SiteContentEditor";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { SITE_CONTENT_FIELDS, SITE_CONTENT_KEYS, siteContentFallback } from "@/lib/site-content";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Locale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

const CMS_ROLES = ["owner", "administrator", "manager"] as const;
const EDITOR_ROLES = ["owner", "administrator"] as const;
const LOCALES: readonly Locale[] = ["ru", "kg", "en", "kz"];

export default async function ManagerContentPage() {
  const staff = await getCurrentStaff();
  const canRead = hasAnyRole(staff, [...CMS_ROLES]);
  const canEdit = hasAnyRole(staff, [...EDITOR_ROLES]);

  if (!canRead) {
    return (
      <>
        <ManagerHeader title="Сайт / контент" />
        <main className="p-4 lg:p-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            Нет доступа к редактору сайта.
          </div>
        </main>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  let storageReady = Boolean(supabase);
  let drafts: SiteContentDraftRow[] = [];
  let published: SiteContentPublishedRow[] = [];
  let history: SiteContentHistoryRow[] = [];

  if (supabase) {
    const [draftResult, publishedResult, historyResult] = await Promise.all([
      supabase
        .from("site_content_drafts")
        .select("content_key, locale, draft_value, version, updated_at")
        .in("content_key", [...SITE_CONTENT_KEYS]),
      supabase
        .from("site_content_public")
        .select("content_key, locale, published_value, version, published_at")
        .in("content_key", [...SITE_CONTENT_KEYS]),
      supabase
        .from("site_content_history")
        .select("id, content_key, locale, version, action, value, created_at")
        .in("content_key", [...SITE_CONTENT_KEYS])
        .order("created_at", { ascending: false })
        .limit(240),
    ]);

    if (draftResult.error || publishedResult.error || historyResult.error) {
      storageReady = false;
    } else {
      drafts = (draftResult.data ?? []) as SiteContentDraftRow[];
      published = (publishedResult.data ?? []) as SiteContentPublishedRow[];
      history = (historyResult.data ?? []) as SiteContentHistoryRow[];
    }
  }

  const fields = SITE_CONTENT_FIELDS.map((field) => ({
    key: field.key,
    section: field.section,
    label: field.label,
    multiline: field.multiline,
    fallbacks: Object.fromEntries(LOCALES.map((locale) => [locale, siteContentFallback(field, locale)])),
  }));

  return (
    <>
      <ManagerHeader title="Сайт / контент" />
      <main className="space-y-6 p-4 lg:p-8">
        <section className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="font-display text-xl font-semibold text-emerald-deep">Редактор публичного сайта</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Тексты RU / KG / EN / KZ редактируются как черновики. Публичный сайт меняется только после отдельной публикации. Снятие публикации безопасно возвращает текущий кодовый текст.
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
              {canEdit ? "Редактирование: Owner / Administrator" : "Просмотр: Manager"}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Телефоны, WhatsApp, адрес, цены, правила бронирования и другие операционные данные здесь не редактируются. Они остаются в своих утверждённых источниках истины.
          </div>
        </section>

        <SiteContentEditor
          fields={fields}
          drafts={drafts}
          published={published}
          history={history}
          canEdit={canEdit}
          storageReady={storageReady}
        />
      </main>
    </>
  );
}
