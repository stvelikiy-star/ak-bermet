import ManagerHeader from "@/components/manager/ManagerHeader";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

interface CustomerRelation { full_name?: string | null; phone?: string | null }
interface BookingFinanceRow {
  id: string;
  booking_number: string;
  status: string;
  total_amount_kgs: number | string;
  prepayment_required_kgs: number | string;
  check_in: string;
  check_out: string;
  customers: CustomerRelation | CustomerRelation[] | null;
}

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function money(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount)} сом` : "—";
}

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Ожидает подтверждения",
  confirmed: "Подтверждена",
  checked_in: "Заселён",
  checked_out: "Выехал",
  cancelled: "Отменена",
  no_show: "Не заехал",
};

export default async function ManagerPaymentsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  let rows: BookingFinanceRow[] = [];
  let readError = false;
  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_number, status, total_amount_kgs, prepayment_required_kgs, check_in, check_out, customers ( full_name, phone )")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) readError = true;
    else rows = data as BookingFinanceRow[];
  }

  const active = rows.filter((row) => !["cancelled", "no_show", "checked_out"].includes(row.status));
  const totalBooked = active.reduce((sum, row) => sum + Number(row.total_amount_kgs || 0), 0);
  const totalPrepaymentRequired = active.reduce((sum, row) => sum + Number(row.prepayment_required_kgs || 0), 0);

  return (
    <>
      <ManagerHeader title="Оплаты" />
      <main className="space-y-5 p-4 lg:p-8">
        {!allowed ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Для финансового раздела нужна роль Собственник, Администратор или Менеджер.</div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Supabase Auth не настроен на этом окружении.</div>
        ) : readError ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Не удалось прочитать финансовые данные броней. Mock-данные не используются.</div>
        ) : (
          <>
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Отдельный реестр фактических платежей ещё не активирован. Поэтому здесь показаны только реальные суммы броней и требуемая предоплата 20%; поля «оплачено» и «остаток» не выдумываются.
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Активных броней</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{active.length}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Сумма активных броней</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(totalBooked)}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Требуемая предоплата 20%</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(totalPrepaymentRequired)}</p></div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Бронь</th>
                    <th className="px-4 py-3 font-medium">Клиент</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Сумма</th>
                    <th className="px-4 py-3 font-medium">Предоплата 20%</th>
                    <th className="px-4 py-3 font-medium">Факт оплаты</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Броней пока нет.</td></tr>
                  ) : rows.map((row) => {
                    const customer = first(row.customers);
                    return (
                      <tr key={row.id} className="hover:bg-cream/40">
                        <td className="px-4 py-3 font-semibold text-emerald-deep">{row.booking_number}</td>
                        <td className="px-4 py-3"><div className="font-medium text-emerald-deep">{customer?.full_name ?? "—"}</div><div className="text-xs text-muted">{customer?.phone ?? "—"}</div></td>
                        <td className="px-4 py-3 text-muted">{STATUS_LABELS[row.status] ?? row.status}</td>
                        <td className="px-4 py-3 text-emerald-deep">{money(row.total_amount_kgs)}</td>
                        <td className="px-4 py-3 text-emerald-deep">{money(row.prepayment_required_kgs)}</td>
                        <td className="px-4 py-3 text-muted">Не хранится</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
