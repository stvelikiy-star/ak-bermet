import HousekeepingDashboard from "@/components/housekeeping/HousekeepingDashboard";
import { requireStaffRole } from "@/lib/auth/require-role";

export default async function HousekeepingHome() {
  const staff = await requireStaffRole(["housekeeping"]);
  return (
    <HousekeepingDashboard
      staffName={staff.fullName ?? staff.email ?? "Сотрудник"}
    />
  );
}
