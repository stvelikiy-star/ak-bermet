-- AK BERMET — follow-up for environments where the CMS core migration was already applied.
-- RETURNS TABLE output names content_key/locale are PL/pgSQL variables, so explicit
-- ON CONFLICT column lists are ambiguous at runtime. Target named PK constraints instead.

create or replace function public.fn_save_site_content_draft(
  p_content_key text,
  p_locale text,
  p_value text
)
returns table (content_key text, locale text, version integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_content_key, '')));
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_value text := coalesce(p_value, '');
  v_version integer;
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator')
  ) then
    raise exception 'site_content_not_authorized' using errcode = '42501';
  end if;
  if length(v_key) < 3 or length(v_key) > 160 or v_key !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' then
    raise exception 'invalid_content_key' using errcode = '22023';
  end if;
  if v_locale not in ('ru','kg','en','kz') then
    raise exception 'invalid_content_locale' using errcode = '22023';
  end if;
  if length(v_value) > 20000 then
    raise exception 'content_value_too_long' using errcode = '22023';
  end if;

  insert into public.site_content_drafts (
    content_key, locale, draft_value, version, updated_by, created_at, updated_at
  ) values (
    v_key, v_locale, v_value, 1, v_user_id, now(), now()
  )
  on conflict on constraint site_content_drafts_pkey do update
    set draft_value = excluded.draft_value,
        version = public.site_content_drafts.version + 1,
        updated_by = v_user_id,
        updated_at = now()
  returning site_content_drafts.version into v_version;

  insert into public.site_content_history (
    content_key, locale, version, action, value, actor_id
  ) values (
    v_key, v_locale, v_version, 'draft_saved', v_value, v_user_id
  );

  return query select v_key, v_locale, v_version;
end;
$$;

create or replace function public.fn_publish_site_content(
  p_content_key text,
  p_locale text
)
returns table (content_key text, locale text, version integer, published_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_content_key, '')));
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_draft public.site_content_drafts%rowtype;
  v_published_at timestamptz := now();
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator')
  ) then
    raise exception 'site_content_not_authorized' using errcode = '42501';
  end if;

  select * into v_draft
  from public.site_content_drafts
  where site_content_drafts.content_key = v_key
    and site_content_drafts.locale = v_locale
  for update;

  if not found then
    raise exception 'site_content_draft_not_found' using errcode = '22023';
  end if;
  if nullif(btrim(v_draft.draft_value), '') is null then
    raise exception 'site_content_publish_empty' using errcode = '22023';
  end if;

  insert into public.site_content_public (
    content_key, locale, published_value, version, published_by, published_at, updated_at
  ) values (
    v_key, v_locale, v_draft.draft_value, v_draft.version, v_user_id, v_published_at, v_published_at
  )
  on conflict on constraint site_content_public_pkey do update
    set published_value = excluded.published_value,
        version = excluded.version,
        published_by = excluded.published_by,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at;

  insert into public.site_content_history (
    content_key, locale, version, action, value, actor_id
  ) values (
    v_key, v_locale, v_draft.version, 'published', v_draft.draft_value, v_user_id
  );

  return query select v_key, v_locale, v_draft.version, v_published_at;
end;
$$;

create or replace function public.fn_restore_site_content_draft(
  p_history_id uuid
)
returns table (content_key text, locale text, version integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_history public.site_content_history%rowtype;
  v_version integer;
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator')
  ) then
    raise exception 'site_content_not_authorized' using errcode = '42501';
  end if;
  if p_history_id is null then
    raise exception 'site_content_history_required' using errcode = '22023';
  end if;

  select * into v_history
  from public.site_content_history
  where id = p_history_id;

  if not found or v_history.value is null then
    raise exception 'site_content_history_not_found' using errcode = '22023';
  end if;

  insert into public.site_content_drafts (
    content_key, locale, draft_value, version, updated_by, created_at, updated_at
  ) values (
    v_history.content_key, v_history.locale, v_history.value, 1, v_user_id, now(), now()
  )
  on conflict on constraint site_content_drafts_pkey do update
    set draft_value = excluded.draft_value,
        version = public.site_content_drafts.version + 1,
        updated_by = v_user_id,
        updated_at = now()
  returning site_content_drafts.version into v_version;

  insert into public.site_content_history (
    content_key, locale, version, action, value, actor_id, source_history_id
  ) values (
    v_history.content_key, v_history.locale, v_version, 'restored', v_history.value, v_user_id, v_history.id
  );

  return query select v_history.content_key, v_history.locale, v_version;
end;
$$;
