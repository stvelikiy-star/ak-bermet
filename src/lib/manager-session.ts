import { cookies } from "next/headers";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "./manager-auth";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";

const MANAGER_AREA_ROLES = ["owner", "administrator", "manager"] as const;

// Серверная проверка сессии менеджера (для route handlers).
// Два независимых пути входа:
//   1. Supabase Auth с ролью owner/administrator/manager — основной
//      способ (см. /staff/login, src/lib/auth/current-staff.ts).
//   2. Легаси PIN-cookie — временный резервный вход, см. .env.example
//      и src/lib/manager-auth.ts. Сохранён без изменений для обратной
//      совместимости c уже работающими сценариями (например,
//      /manager/operations).
export async function isManagerAuthenticated(): Promise<boolean> {
  if (!isManagerAuthEnabled()) return true;
  const store = await cookies();
  const value = store.get(getManagerCookieName())?.value;
  if (isValidManagerSession(value)) return true;

  const staff = await getCurrentStaff();
  return hasAnyRole(staff, [...MANAGER_AREA_ROLES]);
}
