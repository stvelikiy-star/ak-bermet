-- Index every currently uncovered public-schema foreign key used by AK BERMET.
-- This keeps joins, relationship lookups, and parent-row updates/deletes efficient
-- as booking and operational history grows.

create index if not exists idx_availability_holds_held_by on public.availability_holds (held_by);
create index if not exists idx_availability_holds_lead_id on public.availability_holds (lead_id);
create index if not exists idx_booking_status_history_changed_by on public.booking_status_history (changed_by);
create index if not exists idx_bookings_confirmed_by on public.bookings (confirmed_by);
create index if not exists idx_bookings_created_by on public.bookings (created_by);
create index if not exists idx_bookings_lead_id on public.bookings (lead_id);
create index if not exists idx_cleaning_task_history_changed_by on public.cleaning_task_history (changed_by);
create index if not exists idx_cleaning_tasks_created_by on public.cleaning_tasks (created_by);
create index if not exists idx_lead_status_history_changed_by on public.lead_status_history (changed_by);
create index if not exists idx_leads_booking_id on public.leads (booking_id);
create index if not exists idx_leads_assigned_manager_id on public.leads (assigned_manager_id);
create index if not exists idx_leads_customer_id on public.leads (customer_id);
create index if not exists idx_leads_room_category_id on public.leads (room_category_id);
create index if not exists idx_maintenance_requests_cleaning_task_id on public.maintenance_requests (cleaning_task_id);
create index if not exists idx_maintenance_requests_closed_by on public.maintenance_requests (closed_by);
create index if not exists idx_maintenance_requests_reported_by on public.maintenance_requests (reported_by);
create index if not exists idx_maintenance_work_logs_technician_id on public.maintenance_work_logs (technician_id);
create index if not exists idx_occupancy_periods_availability_hold_id on public.occupancy_periods (availability_hold_id);
create index if not exists idx_occupancy_periods_booking_room_id on public.occupancy_periods (booking_room_id);
create index if not exists idx_occupancy_periods_room_block_id on public.occupancy_periods (room_block_id);
create index if not exists idx_room_amenities_amenity_id on public.room_amenities (amenity_id);
create index if not exists idx_room_blocks_created_by on public.room_blocks (created_by);
create index if not exists idx_room_extra_capacity_rules_room_category_id on public.room_extra_capacity_rules (room_category_id);
create index if not exists idx_room_inspections_inspected_by on public.room_inspections (inspected_by);
create index if not exists idx_room_status_history_changed_by on public.room_status_history (changed_by);
create index if not exists idx_room_status_history_cleaning_task_id on public.room_status_history (cleaning_task_id);
create index if not exists idx_room_status_history_maintenance_request_id on public.room_status_history (maintenance_request_id);
create index if not exists idx_room_status_history_room_inspection_id on public.room_status_history (room_inspection_id);
create index if not exists idx_room_units_room_category_id on public.room_units (room_category_id);
create index if not exists idx_sheets_sync_history_sync_queue_id on public.sheets_sync_history (sync_queue_id);
create index if not exists idx_staff_assignments_assigned_by on public.staff_assignments (assigned_by);
create index if not exists idx_staff_property_assignments_building_id on public.staff_property_assignments (building_id);
create index if not exists idx_task_attachments_uploaded_by on public.task_attachments (uploaded_by);
create index if not exists idx_user_roles_granted_by on public.user_roles (granted_by);
create index if not exists idx_user_roles_role_id on public.user_roles (role_id);
