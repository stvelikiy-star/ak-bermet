import ManagerHeader from "@/components/manager/ManagerHeader";
import { mockRoomRegistry } from "@/data/manager-mock";

const bed = (b?: string) =>
  b === "double" ? "Двуспальная" : b === "twin" ? "Раздельные" : b === "mixed" ? "Смешанная" : "—";

export default function ManagerAvailabilityPage() {
  return (
    <>
      <ManagerHeader title="Занятость" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Эта таблица является промежуточной. Финальная проверка должна сверяться
          с 1С или актуальной внутренней системой.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input type="text" placeholder="Корпус" className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm" disabled />
          <input type="text" placeholder="Категория" className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm" disabled />
          <input type="date" className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm" disabled />
          <input type="date" className="rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm" disabled />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ID номера</th>
                <th className="px-4 py-3 font-medium">Корпус</th>
                <th className="px-4 py-3 font-medium">Этаж</th>
                <th className="px-4 py-3 font-medium">Номер</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Кровать</th>
                <th className="px-4 py-3 font-medium">Вмест.</th>
                <th className="px-4 py-3 font-medium">Wi-Fi</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {mockRoomRegistry.map((r) => (
                <tr key={r.id} className="hover:bg-cream/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{r.id}</td>
                  <td className="px-4 py-3 text-emerald-deep">{r.building}</td>
                  <td className="px-4 py-3 text-muted">{r.floor ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.roomNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-emerald-deep">{r.category}</td>
                  <td className="px-4 py-3 text-muted">{bed(r.bedType)}</td>
                  <td className="px-4 py-3 text-muted">{r.capacity}</td>
                  <td className="px-4 py-3 text-muted">{r.hasWifi ? "Да" : "Нет"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
                      {r.status === "active" ? "Предварительно свободно" : r.status === "maintenance" ? "Ремонт" : "Не продавать"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
