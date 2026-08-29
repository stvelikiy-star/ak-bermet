import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { SITE_CONTENT_KEYS } from "@/lib/site-content";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const EDITOR_ROLES = ["owner", "administrator"] as const;
const ALLOWED_KEYS = new Set(SITE_CONTENT_KEYS);
const ALLOWED_LOCALES = new Set(["ru", "kg", "en", "kz"]);

type Action = "save" | "publish" | "unpublish" | "restore";

type Payload =
  | { action: "save"; contentKey: string; locale: string; value: string }
  | { action: "publish" | "unpublish"; contentKey: string; locale: string }
  | { action: "restore"; historyId: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePayload(value: unknown): Payload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const action: Action | null = ["save", "publish", "unpublish", "restore"].includes(String(input.action))
    ? (String(input.action) as Action)
    : null;
  if (!action) return null;

  if (action === "restore") {
    const historyId = typeof input.historyId === "string" ? input.historyId.trim() : "";
    return isUuid(historyId) ? { action, historyId } : null;
  }

  const contentKey = typeof input.contentKey === "string" ? input.contentKey.trim() : "";
  const locale = typeof input.locale === "string" ? input.locale.trim().toLowerCase() : "";
  if (!ALLOWED_KEYS.has(contentKey) || !ALLOWED_LOCALES.has(locale)) return null;

  if (action === "save") {
    const text = typeof input.value === "string" ? input.value : "";
    if (text.length > 20000) return null;
    return { action, contentKey, locale, value: text };
  }

  return { action, contentKey, locale };
}

function publicError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "42501") return { status: 403, code: "ACCESS_DENIED" };
  if (error.code === "22023") {
    const known = new Set([
      "invalid_content_key",
      "invalid_content_locale",
      "content_value_too_long",
      "site_content_draft_not_found",
      "site_content_publish_empty",
      "site_content_history_required",
      "site_content_history_not_found",
    ]);
    const message = error.message ?? "";
    return { status: 400, code: known.has(message) ? message.toUpperCase() : "INVALID_CONTENT" };
  }
  return { status: 500, code: "CONTENT_WRITE_FAILED" };
}

export async function POST(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!hasAnyRole(staff, [...EDITOR_ROLES])) {
    return NextResponse.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const payload = parsePayload(raw);
  if (!payload) {
    return NextResponse.json({ ok: false, code: "INVALID_CONTENT" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "AUTH_CONFIGURATION" }, { status: 503 });
  }

  let data: unknown = null;
  let error: { code?: string | null; message?: string | null } | null = null;

  if (payload.action === "save") {
    const result = await supabase.rpc("fn_save_site_content_draft", {
      p_content_key: payload.contentKey,
      p_locale: payload.locale,
      p_value: payload.value,
    });
    data = result.data;
    error = result.error;
  } else if (payload.action === "publish") {
    const result = await supabase.rpc("fn_publish_site_content", {
      p_content_key: payload.contentKey,
      p_locale: payload.locale,
    });
    data = result.data;
    error = result.error;
  } else if (payload.action === "unpublish") {
    const result = await supabase.rpc("fn_unpublish_site_content", {
      p_content_key: payload.contentKey,
      p_locale: payload.locale,
    });
    data = result.data;
    error = result.error;
  } else {
    const result = await supabase.rpc("fn_restore_site_content_draft", {
      p_history_id: payload.historyId,
    });
    data = result.data;
    error = result.error;
  }

  if (error) {
    const safe = publicError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }

  if (payload.action === "publish" || payload.action === "unpublish") {
    revalidatePath("/");
  }
  revalidatePath("/manager/content");

  return NextResponse.json({ ok: true, data });
}
