import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(new URL("./20260829130000_site_content_cms_core.sql", import.meta.url), "utf8");
const runtimeFix = fs.readFileSync(new URL("./20260829133000_site_content_cms_rpc_runtime_fix.sql", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../../src/lib/site-content.ts", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../../src/app/api/manager/content/route.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../../src/app/manager/content/page.tsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../../src/components/manager/SiteContentEditor.tsx", import.meta.url), "utf8");
const hero = fs.readFileSync(new URL("../../src/components/sections/HeroSection.tsx", import.meta.url), "utf8");
const contacts = fs.readFileSync(new URL("../../src/components/sections/ContactsSection.tsx", import.meta.url), "utf8");
const sidebar = fs.readFileSync(new URL("../../src/components/manager/ManagerSidebar.tsx", import.meta.url), "utf8");
const sql = migration.replace(/\s+/g, " ").toLowerCase();
const fixSql = runtimeFix.replace(/\s+/g, " ").toLowerCase();

test("CMS physically separates private drafts/history from public published content", () => {
  assert.match(sql, /create table if not exists public\.site_content_drafts/);
  assert.match(sql, /create table if not exists public\.site_content_public/);
  assert.match(sql, /create table if not exists public\.site_content_history/);
  assert.match(sql, /alter table public\.site_content_drafts enable row level security/);
  assert.match(sql, /alter table public\.site_content_public enable row level security/);
  assert.match(sql, /alter table public\.site_content_history enable row level security/);
  assert.match(sql, /revoke all on public\.site_content_drafts from anon, authenticated/);
  assert.match(sql, /revoke all on public\.site_content_history from anon, authenticated/);
  assert.match(sql, /revoke all on public\.site_content_public from anon, authenticated/);
  assert.match(sql, /grant select on public\.site_content_drafts to authenticated/);
  assert.match(sql, /grant select on public\.site_content_history to authenticated/);
  assert.match(sql, /grant select \(content_key, locale, published_value, version, published_at\) on public\.site_content_public to anon, authenticated/);
  assert.doesNotMatch(sql, /grant select \([^)]*published_by/);
  assert.doesNotMatch(sql, /grant select \([^)]*updated_at/);
});

test("CMS writes are RPC-only, owner/admin gated and anonymous execution is revoked", () => {
  for (const fn of [
    "fn_save_site_content_draft",
    "fn_publish_site_content",
    "fn_restore_site_content_draft",
    "fn_unpublish_site_content",
  ]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(sql, new RegExp(`revoke execute on function public\\.${fn}[\\s\\S]*from anon`));
  }
  assert.match(sql, /public\.has_role\('owner'\) or public\.has_role\('administrator'\)/);
  assert.doesNotMatch(api, /\.from\("site_content_(drafts|public|history)"\)\.(insert|update|delete)/);
});

test("CMS upserts target named constraints to avoid PL/pgSQL RETURNS TABLE ambiguity", () => {
  assert.match(sql, /on conflict on constraint site_content_drafts_pkey do update/);
  assert.match(sql, /on conflict on constraint site_content_public_pkey do update/);
  assert.doesNotMatch(sql, /on conflict \(content_key, locale\) do update/);

  assert.match(fixSql, /create or replace function public\.fn_save_site_content_draft/);
  assert.match(fixSql, /create or replace function public\.fn_publish_site_content/);
  assert.match(fixSql, /create or replace function public\.fn_restore_site_content_draft/);
  assert.match(fixSql, /on conflict on constraint site_content_drafts_pkey do update/);
  assert.match(fixSql, /on conflict on constraint site_content_public_pkey do update/);
  assert.doesNotMatch(fixSql, /on conflict \(content_key, locale\) do update/);
});

test("publish, unpublish and restore preserve explicit version history", () => {
  assert.match(sql, /'draft_saved'/);
  assert.match(sql, /'published'/);
  assert.match(sql, /'restored'/);
  assert.match(sql, /'unpublished'/);
  assert.match(sql, /source_history_id/);
  assert.match(sql, /delete from public\.site_content_public/);
  assert.doesNotMatch(sql, /delete from public\.site_content_drafts/);
  assert.doesNotMatch(sql, /delete from public\.site_content_history/);
});

test("CMS supports all four public locales and preserves static fallback", () => {
  for (const locale of ["ru", "kg", "en", "kz"]) {
    assert.match(sql, new RegExp(`'${locale}'`));
  }
  assert.match(registry, /siteContentFallback/);
  assert.match(registry, /return t\(field\.source, locale\)/);
  assert.match(registry, /if \(error \|\| !data\) return \{\}/);
  assert.match(registry, /return value \|\| fallback/);
});

test("public Hero and Contacts read published overrides without exposing operational contacts to CMS", () => {
  assert.match(hero, /loadPublishedSiteContent/);
  assert.match(hero, /contentValue/);
  assert.match(contacts, /loadPublishedSiteContent/);
  assert.match(contacts, /contentValue/);
  assert.doesNotMatch(registry, /phoneRaw|phoneDisplay|springsPhoneRaw|springsPhoneDisplay|mapUrl|address/);
  assert.match(contacts, /SITE\.address/);
  assert.match(contacts, /SITE\.phoneRaw/);
  assert.match(contacts, /WA\.booking/);
});

test("manager CMS is read-only for manager and editable only by owner/admin", () => {
  assert.match(page, /const CMS_ROLES = \["owner", "administrator", "manager"\]/);
  assert.match(page, /const EDITOR_ROLES = \["owner", "administrator"\]/);
  assert.match(page, /canEdit=\{canEdit\}/);
  assert.match(editor, /Режим просмотра/);
  assert.match(editor, /Сохранить черновик/);
  assert.match(editor, /Опубликовать/);
  assert.match(editor, /Снять публикацию/);
  assert.match(editor, /Восстановить в черновик/);
  assert.match(sidebar, /\/manager\/content/);
});

test("editor cannot publish or restore over unsaved local text", () => {
  assert.match(editor, /const hasUnsavedChanges = value !== savedDraftValue/);
  assert.match(editor, /!draft\.draft_value\.trim\(\) \|\| hasUnsavedChanges/);
  assert.match(editor, /Boolean\(busy\) \|\| hasUnsavedChanges/);
  assert.match(editor, /Сначала сохраните черновик перед публикацией или восстановлением версии/);
});

test("manager API only accepts registered CMS keys and supported actions", () => {
  assert.match(api, /const ALLOWED_KEYS = new Set\(SITE_CONTENT_KEYS\)/);
  assert.match(api, /const ALLOWED_LOCALES = new Set\(\["ru", "kg", "en", "kz"\]\)/);
  for (const action of ["save", "publish", "unpublish", "restore"]) {
    assert.match(api, new RegExp(`"${action}"`));
  }
  assert.match(api, /revalidatePath\("\/"\)/);
  assert.match(api, /revalidatePath\("\/manager\/content"\)/);
});
