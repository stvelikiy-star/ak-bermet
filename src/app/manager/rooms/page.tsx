import ManagerHeader from "@/components/manager/ManagerHeader";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

interface RelationName { name?: string | null }
interface RoomRow {
  id: string;
  floor: number | null;
  room_number: string;
  official_beds: number;
  max_capacity: number;
  extra_places: number;
  view_side: string;
  has_wifi: boolean;
  distance_to_spa_meters: number | null;
  distance_to_beach_meters: number | null;
  sellable_status: string;
  operational_status: string;
  buildings: RelationName | RelationName[] | null;
  room_categories: RelationName | RelationName[] | null;
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const OPERATIONAL_LABELS: Record<string, string> = {
  checkout_pending: "Ожидает выезда",
  cleaning_required: "Нужна уборка",
  cleaning_in_progress: "Уборка идёт",
  inspection_required: "Нужна проверка",
  ready: "Готов",
  maintenance_required: "Нужен ремонт",
  maintenance_in_progress: "Ремонт идёт",
  blocked: "Заблокирован",
};

const SELLABLE_LABELS: Record<string, string> = {
  active: "В продаже",
  inactive: "Неактивен",
  do_not_sell: "Не продавать",
};

function AccessPanel({ text }: { text: string }) {
  return <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{text}</div>;
}

export default async function ManagerRoomsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  let rooms: RoomRow[] = [];
  let readError = false;
  if (supabase) {
    const { data, error } = await supabase
      .from("room_units")
      .select("id, floor, room_number, official_beds, max_capacity, extra_places, view_side, has_wifi, distance_to_spa_meters, distance_to_beach_meters, sellable_status, operational_status, buildings ( name ), room_categories ( name )")
      .is("deleted_at", null);
    if (error || !data) readError = true;
    else {
      rooms = (data as RoomRow[]).sort((a, b) => {
        const aBuilding = first(a.buildings)?.name ?? "";
        const bBuilding = first(b.buildings)?.name ?? "";
        return aBuilding.localeCompare(bBuilding, "ru") || a.room_number.localeCompare(b.room_number, "ru", { numeric: true });
      });
    }
  }

  const ready = rooms.filter((room) => room.operational_status === "ready" && room.sellable_status === "active").length;
  const cleaning = rooms.filter((room) => room.operational_status.startsWith("cleaning_")).length;
  const maintenance = rooms.filter((room) => ["maintenance_required", "maintenance_in_progress", "blocked"].includes(room.operational_status)).length;

  return (
    <>
      <ManagerHeader title="Номерной фонд" />
      <main className="space-y-5 p-4 lg:p-8">
        {!allowed ? (
          <AccessPanel text="Для просмотра номерного фонда нужна роль Собственник, Администратор или Менеджер." />
        ) : !supabase ? (
          <AccessPanel text="Supabase Auth не настроен на этом окружении." />
        ) : readError ? (
          <AccessPanel text="Не удалось безопасно прочитать номерной фонд. Mock-данные не используются." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Всего номеров</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{rooms.length}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Готовы и в продаже</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{ready}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Уборка</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{cleaning}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Ремонт / блок</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{maintenance}</p></div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">Корпус</th>
                    <th className="px-3 py-3 font-medium">Этаж</th>
                    <th className="px-3 py-3 font-medium">Номер</th>
                    <th className="px-3 py-3 font-medium">Категория</th>
                    <th className="px-3 py-3 font-medium">Мест</th>
                    <th className="px-3 py-3 font-medium">Макс.</th>
                    <th className="px-3 py-3 font-medium">Доп.</th>
                    <th className="px-3 py-3 font-medium">Вид</th>
                    <th className="px-3 py-3 font-medium">Wi-Fi</th>
                    <th className="px-3 py-3 font-medium">До SPA</th>
                    <th className="px-3 py-3 font-medium">До пляжа</th>
                    <th className="px-3 py-3 font-medium">Продажа</th>
                    <th className="px-3 py-3 font-medium">Состояние</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-cream/40">
                      <td className="px-3 py-3 font-medium text-emerald-deep">{first(room.buildings)?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{room.floor ?? "—"}</td>
                      <td className="px-3 py-3 font-semibold text-emerald-deep">{room.room_number}</td>
                      <td className="px-3 py-3 text-emerald-deep">{first(room.room_categories)?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{room.official_beds}</td>
                      <td className="px-3 py-3 text-muted">{room.max_capacity}</td>
                      <td className="px-3 py-3 text-muted">{room.extra_places}</td>
                      <td className="px-3 py-3 text-muted">{room.view_side === "preferred_nature" ? "Природа" : "Двор / сервис"}</td>
                      <td className="px-3 py-3 text-muted">{room.has_wifi ? "Да" : "Нет"}</td>
                      <td className="px-3 py-3 text-muted">{room.distance_to_spa_meters ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{room.distance_to_beach_meters ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{SELLABLE_LABELS[room.sellable_status] ?? room.sellable_status}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${room.operational_status === "ready" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : maintenance > 0 && ["maintenance_required", "maintenance_in_progress", "blocked"].includes(room.operational_status) ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>{OPERATIONAL_LABELS[room.operational_status] ?? room.operational_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
