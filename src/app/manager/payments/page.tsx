import ManagerHeader from "@/components/manager/ManagerHeader";
import ManualPaymentForm, { type ManualPaymentBookingOption } from "@/components/manager/ManualPaymentForm";
import VoidPaymentButton from "@/components/manager/VoidPaymentButton";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

interface CustomerRelation { full_name?: string | null; phone?: string | null }
interface BookingRow {
  id: string;
  booking_number: string;
  status: string;
  total_amount_kgs: number | string;
  customers: CustomerRelation | CustomerRelation[] | null;
}
interface PaymentRow {
  id: string;
  booking_id: string;
  paid_at: string;
  method: string;
  amount_kgs: number | string;
  currency: string;
  status: string;
  receipt_url: string | null;
  confirmed_by: string;
  confirmed_at: string;
  balance_after_kgs: number | string;
  notes: string | null;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function money(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount)} сом`
    : "—";
}

function dateTime(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bishkek",
  }).format(parsed);
}

export default async function ManagerPaymentsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  let bookings: BookingRow[] = [];
  let payments: PaymentRow[] = [];
  let readError = false;

  if (supabase) {
    const [bookingsResult, paymentsResult] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_number, status, total_amount_kgs, customers ( full_name, phone )")
        .is("deleted_at", null)
        .not("status", "in", '(cancelled,no_show,checked_out)')
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("booking_payments")
        .select("id, booking_id, paid_at, method, amount_kgs, currency, status, receipt_url, confirmed_by, confirmed_at, balance_after_kgs, notes, void_reason, voided_at, created_at")
        .is("deleted_at", null)
        .order("paid_at", { ascending: false })
        .limit(500),
    ]);

    if (bookingsResult.error || paymentsResult.error || !bookingsResult.data || !paymentsResult.data) {
      readError = true;
    } else {
      bookings = bookingsResult.data as BookingRow[];
      payments = paymentsResult.data as PaymentRow[];
    }
  }

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const paidByBooking = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "confirmed") continue;
    paidByBooking.set(payment.booking_id, (paidByBooking.get(payment.booking_id) ?? 0) + Number(payment.amount_kgs || 0));
  }

  const bookingOptions: ManualPaymentBookingOption[] = bookings.map((booking) => ({
    id: booking.id,
    number: booking.booking_number,
    guest: first(booking.customers)?.full_name ?? "Без имени",
    totalKgs: Number(booking.total_amount_kgs || 0),
    paidKgs: paidByBooking.get(booking.id) ?? 0,
  }));

  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const confirmedTotal = confirmedPayments.reduce((sum, payment) => sum + Number(payment.amount_kgs || 0), 0);
  const activeBookedTotal = bookings.reduce((sum, booking) => sum + Number(booking.total_amount_kgs || 0), 0);
  const operationalOutstanding = Math.max(activeBookedTotal - confirmedTotal, 0);

  return (
    <>
      <ManagerHeader title="Оплаты" />
      <main className="space-y-6 p-4 lg:p-8">
        {!allowed ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Для работы с оплатами нужна роль Собственник, Администратор или Менеджер.</div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Supabase Auth не настроен на этом окружении.</div>
        ) : readError ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Не удалось прочитать ручной журнал оплат. Неподтверждённые данные не подставляются.</div>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong>Ручной учёт.</strong> Деньги принимает менеджер вне сайта. Здесь фиксируется только подтверждённый человеком факт оплаты, способ, дата и комментарий. Интернет-эквайринга и автоматического списания нет.
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Активные брони</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(activeBookedTotal)}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Фактически зафиксировано</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(confirmedTotal)}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Операционный остаток</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(operationalOutstanding)}</p><p className="mt-1 text-[11px] text-muted">По сумме активных броней, не банковская сверка.</p></div>
            </div>

            {bookingOptions.length > 0 ? (
              <ManualPaymentForm bookings={bookingOptions} />
            ) : (
              <div className="rounded-xl border border-gold/15 bg-white p-5 text-sm text-muted shadow-soft">Нет активных броней, к которым можно привязать оплату.</div>
            )}

            <section className="rounded-xl border border-gold/15 bg-white shadow-soft">
              <div className="border-b border-gold/10 p-4">
                <h2 className="font-display text-lg font-semibold text-emerald-deep">Журнал оплат</h2>
                <p className="mt-1 text-xs text-muted">Записи не удаляются молча. Ошибочная запись аннулируется с обязательной причиной и остаётся в истории.</p>
              </div>

              {payments.length === 0 ? (
                <div className="p-6 text-sm text-muted">Подтверждённых менеджерами оплат пока нет.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead className="bg-cream/60 text-muted">
                      <tr>
                        <th className="px-4 py-3">Дата</th>
                        <th className="px-4 py-3">Бронь / гость</th>
                        <th className="px-4 py-3">Способ</th>
                        <th className="px-4 py-3">Сумма</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Остаток после записи</th>
                        <th className="px-4 py-3">Комментарий</th>
                        <th className="px-4 py-3">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {payments.map((payment) => {
                        const booking = bookingById.get(payment.booking_id);
                        const customer = first(booking?.customers ?? null);
                        return (
                          <tr key={payment.id} className="align-top">
                            <td className="px-4 py-3 text-emerald-deep">{dateTime(payment.paid_at)}</td>
                            <td className="px-4 py-3"><div className="font-semibold text-emerald-deep">{booking?.booking_number ?? payment.booking_id}</div><div className="mt-0.5 text-muted">{customer?.full_name ?? "—"}</div></td>
                            <td className="px-4 py-3 text-emerald-deep">{payment.method}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-deep">{money(payment.amount_kgs)}</td>
                            <td className="px-4 py-3">{payment.status === "confirmed" ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">Подтверждено</span> : <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-800">Аннулировано</span>}</td>
                            <td className="px-4 py-3 text-emerald-deep">{money(payment.balance_after_kgs)}</td>
                            <td className="max-w-[240px] px-4 py-3 text-muted">{payment.status === "void" ? `Причина: ${payment.void_reason ?? "—"}` : payment.notes ?? "—"}</td>
                            <td className="px-4 py-3">{payment.status === "confirmed" ? <VoidPaymentButton paymentId={payment.id} /> : <span className="text-muted">{payment.voided_at ? dateTime(payment.voided_at) : "—"}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
