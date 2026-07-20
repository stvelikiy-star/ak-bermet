import ManagerHeader from "@/components/manager/ManagerHeader";
import { mockRoomRegistry } from "@/data/manager-mock";

const bed = (b?: string) =>
  b === "double" ? "Двуспальная" : b === "twin" ? "Раздельные" : b === "mixed" ? "Смешанная" : "—";
const repair = (r?: string) =>
  r === "premium" ? "Премиум" : r === "new" ? "Новый" : r === "medium" ? "Средний" : r === "old" ? "Старый" : "—";

export default function ManagerRoomsPage() {
  return (
    <>
      <ManagerHeader title="Номерной фонд" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Это демо-кабинет менеджера. Настоящая авторизация будет подключена на
          следующем этапе.
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled className="cursor-not-allowed rounded-full bg-emerald-deep/40 px-5 py-2.5 text-sm font-semibold text-white/70">
            Добавить номер
          </button>
          <button type="button" disabled className="cursor-not-allowed rounded-full border border-gold/30 px-5 py-2.5 text-sm font-semibold text-muted">
            Импорт из Google Sheets
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Корпус</th>
                <th className="px-3 py-3 font-medium">Этаж</th>
                <th className="px-3 py-3 font-medium">Номер</th>
                <th className="px-3 py-3 font-medium">Категория</th>
                <th className="px-3 py-3 font-medium">Кровать</th>
                <th className="px-3 py-3 font-medium">Вмест.</th>
                <th className="px-3 py-3 font-medium">Диван</th>
                <th className="px-3 py-3 font-medium">Доп.место</th>
                <th className="px-3 py-3 font-medium">Wi-Fi</th>
                <th className="px-3 py-3 font-medium">До SPA</th>
                <th className="px-3 py-3 font-medium">До пляжа</th>
                <th className="px-3 py-3 font-medium">Ремонт</th>
                <th className="px-3 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {mockRoomRegistry.map((r) => (
                <tr key={r.id} className="hover:bg-cream/40">
                  <td className="px-3 py-3 font-mono text-xs text-muted">{r.id}</td>
                  <td className="px-3 py-3 text-emerald-deep">{r.building}</td>
                  <td className="px-3 py-3 text-muted">{r.floor ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.roomNumber ?? "—"}</td>
                  <td className="px-3 py-3 text-emerald-deep">{r.category}</td>
                  <td className="px-3 py-3 text-muted">{bed(r.bedType)}</td>
                  <td className="px-3 py-3 text-muted">{r.capacity}</td>
                  <td className="px-3 py-3 text-muted">{r.hasSofa ? "Да" : "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.allowsExtraBed ? "Да" : "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.hasWifi ? "Да" : "Нет"}</td>
                  <td className="px-3 py-3 text-muted">{r.distanceToSpaMeters ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.distanceToBeachMeters ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{repair(r.repairLevel)}</td>
                  <td className="px-3 py-3 text-muted">{r.status === "active" ? "Активен" : r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
