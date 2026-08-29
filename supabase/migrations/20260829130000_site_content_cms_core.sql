-- AK BERMET — site content CMS core.
-- Drafts are private staff data. Only separately published rows are readable publicly.

create table if not exists public.site_content_drafts (
  content_key text not null,
  locale text not null,
  draft_value text not null,
  version integer not null default 1,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_key, locale),
  constraint site_content_drafts_key_shape check (
    length(content_key) between 3 and 160
    and content_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
  ),
  constraint site_content_drafts_locale check (locale in ('ru','kg','en','kz')),
  constraint site_content_drafts_value_size check (length(draft_value) <= 20000),
  constraint site_content_drafts_version_positive check (version > 0)
);

create table if not exists public.site_content_public (
  content_key text not null,
  locale text not null,
  published_value text not null,
  version integer not null,
  published_by uuid not null references public.profiles(id) on delete restrict,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_key, locale),
  constraint site_content_public_key_shape check (
    length(content_key) between 3 and 160
    and content_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
  ),
  constraint site_content_public_locale check (locale in ('ru','kg','en','kz')),
  constraint site_content_public_value_nonempty check (length(btrim(published_value)) > 0),
  constraint site_content_public_value_size check (length(published_value) <= 20000),
  constraint site_content_public_version_positive check (version > 0)
);

create table if not exists public.site_content_history (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  locale text not null,
  version integer not null,
  action text not null,
  value text,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  source_history_id uuid references public.site_content_history(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint site_content_history_key_shape check (
    length(content_key) between 3 and 160
    and content_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
  ),
  constraint site_content_history_locale check (locale in ('ru','kg','en','kz')),
  constraint site_content_history_action check (action in ('draft_saved','published','restored','unpublished')),
  constraint site_content_history_value_size check (value is null or length(value) <= 20000),
  constraint site_content_history_version_positive check (version > 0)
);

create index if not exists site_content_drafts_updated_by_idx
  on public.site_content_drafts(updated_by);
create index if not exists site_content_public_published_by_idx
  on public.site_content_public(published_by);
create index if not exists site_content_history_key_locale_idx
  on public.site_content_history(content_key, locale, created_at desc);
create index if not exists site_content_history_actor_idx
  on public.site_content_history(actor_id, created_at desc);
create index if not exists site_content_history_source_idx
  on public.site_content_history(source_history_id)
  where source_history_id is not null;

alter table public.site_content_drafts enable row level security;
alter table public.site_content_public enable row level security;
alter table public.site_content_history enable row level security;

revoke all on public.site_content_drafts from anon;
revoke all on public.site_content_history from anon;
revoke insert, update, delete on public.site_content_drafts from authenticated;
revoke insert, update, delete on public.site_content_public from anon, authenticated;
revoke insert, update, delete on public.site_content_history from authenticated;
grant select on public.site_content_drafts to authenticated;
grant select on public.site_content_history to authenticated;
grant select on public.site_content_public to anon, authenticated;

drop policy if exists site_content_drafts_staff_read on public.site_content_drafts;
create policy site_content_drafts_staff_read
on public.site_content_drafts
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

drop policy if exists site_content_history_staff_read on public.site_content_history;
create policy site_content_history_staff_read
on public.site_content_history
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

drop policy if exists site_content_public_read on public.site_content_public;
create policy site_content_public_read
on public.site_content_public
for select
to anon, authenticated
using (true);

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
  on conflict (content_key, locale) do update
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
  on conflict (content_key, locale) do update
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
  on conflict (content_key, locale) do update
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

create or replace function public.fn_unpublish_site_content(
  p_content_key text,
  p_locale text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_content_key, '')));
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_public public.site_content_public%rowtype;
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator')
  ) then
    raise exception 'site_content_not_authorized' using errcode = '42501';
  end if;

  select * into v_public
  from public.site_content_public
  where site_content_public.content_key = v_key
    and site_content_public.locale = v_locale
  for update;

  if not found then
    return false;
  end if;

  delete from public.site_content_public
  where site_content_public.content_key = v_key
    and site_content_public.locale = v_locale;

  insert into public.site_content_history (
    content_key, locale, version, action, value, actor_id
  ) values (
    v_key, v_locale, v_public.version, 'unpublished', v_public.published_value, v_user_id
  );

  return true;
end;
$$;

revoke all on function public.fn_save_site_content_draft(text,text,text) from public;
revoke all on function public.fn_publish_site_content(text,text) from public;
revoke all on function public.fn_restore_site_content_draft(uuid) from public;
revoke all on function public.fn_unpublish_site_content(text,text) from public;
revoke execute on function public.fn_save_site_content_draft(text,text,text) from anon;
revoke execute on function public.fn_publish_site_content(text,text) from anon;
revoke execute on function public.fn_restore_site_content_draft(uuid) from anon;
revoke execute on function public.fn_unpublish_site_content(text,text) from anon;
grant execute on function public.fn_save_site_content_draft(text,text,text) to authenticated;
grant execute on function public.fn_publish_site_content(text,text) to authenticated;
grant execute on function public.fn_restore_site_content_draft(uuid) to authenticated;
grant execute on function public.fn_unpublish_site_content(text,text) to authenticated;
