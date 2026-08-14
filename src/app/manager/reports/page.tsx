import ManagerHeader from "@/components/manager/ManagerHeader";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

interface LeadRow { source: string; interest: string; status: string }
interface BookingRow { status: string; total_amount_kgs: number | string; prepayment_required_kgs: number | string }

const SOURCE_LABELS: Record<string, string> = {
  website: "Сайт",
  ai_chat: "AI-чат",
  whatsapp: "WhatsApp",
  phone: "Телефон",
  instagram: "Instagram",
  tour_agency: "Турагентство",
  manual: "Вручную",
};

const INTEREST_LABELS: Record<string, string> = {
  rooms: "Номера",
  garden: "Garden",
  hot_springs: "Термальные источники",
  spa: "SPA",
  events: "Мероприятия",
  food: "Питание",
  promo: "Акции",
  general: "Общее",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новые",
  in_progress: "В работе",
  waiting_admin: "Ждут администратора",
  waiting_prepayment: "Ждут предоплату",
  prepaid: "Предоплачены",
  confirmed: "Подтверждены",
  cancelled: "Отменены",
  lost: "Потеряны",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Ждут подтверждения",
  confirmed: "Подтверждены",
  checked_in: "Заселены",
  checked_out: "Выехали",
  cancelled: "Отменены",
  no_show: "Не заехали",
};

function countBy<T>(items: readonly T[], getter: (item: T) => string) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = getter(item);
    if (!key) continue;
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

function Bars({ data, labels }: { data: Record<string, number>; labels: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  if (entries.length === 0) return <p className="text-sm text-muted">Данных пока нет.</p>;
  return (
    <div className="space-y-2.5">
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-xs text-muted"><span>{labels[key] ?? key}</span><span>{value}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold" style={{ width: `${(value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function money(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} сом`;
}

export default async function ManagerReportsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  const leads: LeadRow[] = [];
  const bookings: BookingRow[] = [];
  let readError = false;

  if (supabase) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("leads")
        .select("source, interest, status")
        .is("deleted_at", null)
        .range(from, from + 999);
      if (error) { readError = true; break; }
      const page = (data ?? []) as LeadRow[];
      leads.push(...page);
      if (page.length < 1000) break;
    }

    if (!readError) {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("bookings")
          .select("status, total_amount_kgs, prepayment_required_kgs")
          .is("deleted_at", null)
          .range(from, from + 999);
        if (error) { readError = true; break; }
        const page = (data ?? []) as BookingRow[];
        bookings.push(...page);
        if (page.length < 1000) break;
      }
    }
  }

  const bySource = countBy(leads, (lead) => lead.source);
  const byInterest = countBy(leads, (lead) => lead.interest);
  const byLeadStatus = countBy(leads, (lead) => lead.status);
  const byBookingStatus = countBy(bookings, (booking) => booking.status);
  const activeBookings = bookings.filter((booking) => !["cancelled", "no_show", "checked_out"].includes(booking.status));
  const bookedTotal = activeBookings.reduce((sum, booking) => sum + Number(booking.total_amount_kgs || 0), 0);
  const requiredPrepayment = activeBookings.reduce((sum, booking) => sum + Number(booking.prepayment_required_kgs || 0), 0);

  return (
    <>
      <ManagerHeader title="Отчёты" />
      <main className="space-y-6 p-4 lg:p-8">
        {!allowed ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Для отчётов нужна роль Собственник, Администратор или Менеджер.</div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Supabase Auth не настроен на этом окружении.</div>
        ) : readError ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Не удалось построить отчёт из актуальных данных. Mock-данные не используются.</div>
        ) : (
          <>
            <p className="text-sm text-muted">Аналитика строится из authoritative Supabase leads и bookings.</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Всего заявок</p><p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{leads.length}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Всего броней</p><p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{bookings.length}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Сумма активных броней</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(bookedTotal)}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Требуемая предоплата 20%</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(requiredPrepayment)}</p><p className="mt-1 text-[11px] text-muted">Не равно фактически оплаченному</p></div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по источникам</h2><Bars data={bySource} labels={SOURCE_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по направлениям</h2><Bars data={byInterest} labels={INTEREST_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Статусы заявок</h2><Bars data={byLeadStatus} labels={LEAD_STATUS_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Статусы броней</h2><Bars data={byBookingStatus} labels={BOOKING_STATUS_LABELS} /></div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
