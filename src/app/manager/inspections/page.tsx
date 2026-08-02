import InspectionDashboard from "@/components/manager/InspectionDashboard";
import ManagerHeader from "@/components/manager/ManagerHeader";
import { requireStaffRole } from "@/lib/auth/require-role";

export default async function ManagerInspectionsPage() {
  await requireStaffRole(["owner", "administrator"]);

  return (
    <>
      <ManagerHeader title="Проверка готовности номеров" />
      <main className="space-y-5 p-4 lg:p-8">
        <p className="max-w-3xl text-sm text-muted">
          Здесь собраны завершённые уборки и ремонты, которым требуется
          проверка администратора. Одобрение доступно только при отсутствии
          активной блокирующей технической заявки.
        </p>
        <InspectionDashboard />
      </main>
    </>
  );
}
