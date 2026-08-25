do $$
declare r record;
begin
  for r in
    select * from (values
      ('amenities','amenities_admin_write'),
      ('buildings','buildings_admin_write'),
      ('properties','properties_admin_write'),
      ('room_amenities','room_amenities_admin_write'),
      ('room_bed_configurations','bed_config_admin_write'),
      ('room_categories','room_categories_admin_write'),
      ('room_extra_capacity_rules','extra_capacity_admin_write'),
      ('staff_property_assignments','staff_assignments_admin_write'),
      ('user_roles','user_roles_admin_write')
    ) as x(table_name,old_policy_name)
  loop
    execute format('drop policy if exists %I on public.%I',r.old_policy_name,r.table_name);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_role(''owner'') or public.has_role(''administrator''))',
      r.table_name||'_admin_insert',r.table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_role(''owner'') or public.has_role(''administrator'')) with check (public.has_role(''owner'') or public.has_role(''administrator''))',
      r.table_name||'_admin_update',r.table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_role(''owner'') or public.has_role(''administrator''))',
      r.table_name||'_admin_delete',r.table_name
    );
  end loop;
end $$;
