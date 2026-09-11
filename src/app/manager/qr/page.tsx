import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerQrPanel from "@/components/manager/ManagerQrPanel";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
export const dynamic = "force-dynamic";
const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
export default async function ManagerQrPage() {
  const staff = await getCurrentStaff(); const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  if (!allowed) return (<><ManagerHeader title="QR гостей" /><main className="p-4 lg:p-8"><p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Для управления QR нужна роль Собственник, Администратор или Менеджер.</p></main></>);
  const { data, error } = await getSupabaseAdminClient().from("room_units").select("id, room_number, buildings ( name )").is("deleted_at", null).order("room_number", { ascending: true });
  const rooms = (error ? [] : data ?? []).map((room) => { const building = Array.isArray(room.buildings) ? room.buildings[0] : room.buildings; return { id: room.id, roomNumber: room.room_number, buildingName: building?.name ?? "AK BERMET" }; });
  return (<><ManagerHeader title="QR гостей" /><main className="space-y-6 p-4 lg:p-8"><div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h1 className="font-display text-2xl font-semibold text-emerald-deep">Гостевой сервис по QR</h1><p className="mt-2 max-w-3xl text-sm text-muted">Создайте QR для номера, распечатайте его и разместите в комнате. Гость откроет защищённую страницу и отправит заявку без доступа к административной панели.</p></div>{error ? <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">Не удалось прочитать номерной фонд.</p> : <ManagerQrPanel rooms={rooms} />}</main></>);
}
