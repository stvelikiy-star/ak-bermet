import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";

const MANAGER_AREA_ROLES = ["owner", "administrator", "manager"] as const;

// Серверная проверка сессии менеджера (для route handlers). Supabase
// Auth с ролью owner/administrator/manager — единственный способ входа.
// Легаси PIN-cookie (FNV-1a, offline-подбираемый — см.
// AK_BERMET_CODEX_AUDIT_001.md, H-03) удалён и не может использоваться
// в production. Fail closed: без валидной Supabase-сессии с нужной
// ролью и активным профилем (getCurrentStaff() уже проверяет
// is_active) доступ не предоставляется.
export async function isManagerAuthenticated(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return hasAnyRole(staff, [...MANAGER_AREA_ROLES]);
}
