// Роли персонала — значения строго соответствуют enum public.role_name,
// развёрнутому в Supabase (supabase/migrations/20260721000100_extensions_and_enums.sql).

export type RoleName =
  | "owner"
  | "administrator"
  | "manager"
  | "housekeeping"
  | "technician";

export const ROLE_LABELS: Record<RoleName, string> = {
  owner: "Владелец",
  administrator: "Администратор",
  manager: "Менеджер",
  housekeeping: "Горничная",
  technician: "Техник",
};

export interface CurrentStaff {
  userId: string;
  email: string | null;
  fullName: string | null;
  roles: RoleName[];
}
