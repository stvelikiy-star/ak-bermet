import TechnicianDashboard from "@/components/technician/TechnicianDashboard";
import { requireStaffRole } from "@/lib/auth/require-role";

export default async function TechnicianHome() {
  const staff = await requireStaffRole(["technician"]);
  return (
    <TechnicianDashboard
      staffName={staff.fullName ?? staff.email ?? "Техник"}
    />
  );
}
