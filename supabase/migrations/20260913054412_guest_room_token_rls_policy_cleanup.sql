-- Keep guest QR token access semantics unchanged while removing overlapping
-- permissive SELECT policies. Owners/admins may read/write; managers may read.
-- Scope policies to authenticated explicitly rather than PUBLIC.

drop policy if exists guest_room_tokens_admin_all
  on public.guest_room_access_tokens;
drop policy if exists guest_room_tokens_manager_select
  on public.guest_room_access_tokens;

create policy guest_room_tokens_staff_select
on public.guest_room_access_tokens
for select
to authenticated
using (
  public.has_role('owner'::public.role_name)
  or public.has_role('administrator'::public.role_name)
  or public.has_role('manager'::public.role_name)
);

create policy guest_room_tokens_admin_insert
on public.guest_room_access_tokens
for insert
to authenticated
with check (
  public.has_role('owner'::public.role_name)
  or public.has_role('administrator'::public.role_name)
);

create policy guest_room_tokens_admin_update
on public.guest_room_access_tokens
for update
to authenticated
using (
  public.has_role('owner'::public.role_name)
  or public.has_role('administrator'::public.role_name)
)
with check (
  public.has_role('owner'::public.role_name)
  or public.has_role('administrator'::public.role_name)
);

create policy guest_room_tokens_admin_delete
on public.guest_room_access_tokens
for delete
to authenticated
using (
  public.has_role('owner'::public.role_name)
  or public.has_role('administrator'::public.role_name)
);
