import { redirect } from "next/navigation";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import type { CurrentStaff, RoleName } from "@/types/auth";

// Переиспользуемый серверный guard для protected layouts (/housekeeping,
// /technician). /manager использует src/lib/manager-session.ts вместо
// этой функции для route handlers, но оба пути идут через один и тот же
// Supabase Auth — соответствующая проверка живёт в middleware.ts, а не
// здесь.
export async function requireStaffRole(
  allowed: RoleName[]
): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/login");
  if (!hasAnyRole(staff, allowed)) redirect("/staff/unauthorized");
  return staff;
}
