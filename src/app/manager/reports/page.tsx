import ManagerHeader from "@/components/manager/ManagerHeader";
import { mockLeads } from "@/data/manager-mock";
import type { ManagerLead } from "@/types/manager";
import { INTEREST_LABELS, SOURCE_LABELS } from "@/lib/manager-utils";

function countBy(items: ManagerLead[], key: keyof ManagerLead) {
  const map: Record<string, number> = {};
  for (const it of items) {
    const v = String(it[key] ?? "");
    if (!v) continue;
    map[v] = (map[v] ?? 0) + 1;
  }
  return map;
}

function Bars({ data, labels }: { data: Record<string, number>; labels: Record<string, string> }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{labels[k] ?? k}</span>
            <span>{v}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ManagerReportsPage() {
  const bySource = countBy(mockLeads, "source");
  const byInterest = countBy(mockLeads, "interest");
  const newCount = mockLeads.filter((l) => l.status === "new").length;
  const prepaidCount = mockLeads.filter((l) => l.status === "prepaid" || l.status === "waiting_prepayment").length;
  const confirmedCount = mockLeads.filter((l) => l.status === "confirmed").length;
  const events = mockLeads.filter((l) => l.interest === "events").length;
  const lost = mockLeads.filter((l) => l.status === "lost" || l.status === "cancelled").length;

  return (
    <>
      <ManagerHeader title="Отчёты" />
      <main className="space-y-6 p-4 lg:p-8">
        <p className="text-sm text-muted">Демо-аналитика на основе mock-заявок.</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по источникам</h2>
            <Bars data={bySource} labels={SOURCE_LABELS} />
          </div>
          <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по направлениям</h2>
            <Bars data={byInterest} labels={INTEREST_LABELS} />
          </div>
        </div>

        <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
          <h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Воронка</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-cream/60 p-4 text-center">
              <p className="font-display text-2xl font-semibold text-emerald-deep">{newCount}</p>
              <p className="text-xs text-muted">Новые</p>
            </div>
            <div className="rounded-lg bg-cream/60 p-4 text-center">
              <p className="font-display text-2xl font-semibold text-emerald-deep">{prepaidCount}</p>
              <p className="text-xs text-muted">Предоплата</p>
            </div>
            <div className="rounded-lg bg-cream/60 p-4 text-center">
              <p className="font-display text-2xl font-semibold text-emerald-deep">{confirmedCount}</p>
              <p className="text-xs text-muted">Подтверждены</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
            <p className="text-sm text-muted">Корпоративные заявки</p>
            <p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{events}</p>
          </div>
          <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
            <p className="text-sm text-muted">Отказы / отмены</p>
            <p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{lost}</p>
          </div>
          <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
            <p className="text-sm text-muted">Сумма предоплат</p>
            <p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">—</p>
            <p className="text-xs text-muted">mock</p>
          </div>
        </div>
      </main>
    </>
  );
}
