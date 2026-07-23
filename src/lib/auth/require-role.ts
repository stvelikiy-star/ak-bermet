import { redirect } from "next/navigation";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import type { CurrentStaff, RoleName } from "@/types/auth";

// Переиспользуемый серверный guard для protected layouts. Используется
// напрямую только в разделах без легаси-входа (/housekeeping,
// /technician) — /manager дополнительно допускает легаси PIN, эта
// логика живёт в middleware.ts и src/lib/manager-session.ts, а не здесь.
export async function requireStaffRole(
  allowed: RoleName[]
): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/login");
  if (!hasAnyRole(staff, allowed)) redirect("/staff/unauthorized");
  return staff;
}
