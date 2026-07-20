import ManagerHeader from "@/components/manager/ManagerHeader";
import { mockPayments } from "@/data/manager-mock";
import { PAYMENT_LABELS, PAYMENT_STYLES, formatDate } from "@/lib/manager-utils";

const money = (n: number) => `${n.toLocaleString("ru-RU")} сом`;

export default function ManagerPaymentsPage() {
  return (
    <>
      <ManagerHeader title="Оплаты" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Реквизиты оплаты отправляет только администратор после проверки наличия.
          AI и сайт не отправляют реквизиты автоматически.
        </div>

        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ID заявки</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Предоплата 20%</th>
                <th className="px-4 py-3 font-medium">Оплачено</th>
                <th className="px-4 py-3 font-medium">Остаток</th>
                <th className="px-4 py-3 font-medium">Способ</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {mockPayments.map((p) => (
                <tr key={p.id} className="hover:bg-cream/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.leadId.replace("lead_", "")}</td>
                  <td className="px-4 py-3 font-medium text-emerald-deep">{p.client}</td>
                  <td className="px-4 py-3 text-muted">{money(p.total)}</td>
                  <td className="px-4 py-3 text-muted">{money(p.prepayment)}</td>
                  <td className="px-4 py-3 text-muted">{money(p.paid)}</td>
                  <td className="px-4 py-3 text-muted">{money(p.balance)}</td>
                  <td className="px-4 py-3 text-muted">{p.method ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${PAYMENT_STYLES[p.status]}`}>
                      {PAYMENT_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.date ? formatDate(p.date) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
