import ManagerHeader from "@/components/manager/ManagerHeader";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const ACTIVE_BOOKING_STATUSES = new Set(["pending_confirmation", "confirmed", "checked_in"]);
const PAGE_SIZE = 1000;

interface LeadRow { source: string; interest: string; status: string; booking_id: string | null }
interface BookingRow { id: string; status: string; check_in: string; check_out: string; total_amount_kgs: number | string }
interface PaymentRow { booking_id: string; amount_kgs: number | string; status: string }
interface RoomRow { id: string; sellable_status: string; operational_status: string }
interface OccupancyRow { room_unit_id: string; period_type: string; status: string }

const SOURCE_LABELS: Record<string, string> = {
  website: "Сайт", ai_chat: "AI-чат", whatsapp: "WhatsApp", phone: "Телефон",
  instagram: "Instagram", tour_agency: "Турагентство", manual: "Вручную",
};
const INTEREST_LABELS: Record<string, string> = {
  rooms: "Номера", garden: "Garden", hot_springs: "Термальные источники", spa: "SPA",
  events: "Мероприятия", food: "Питание", promo: "Акции", general: "Общее",
};
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новые", in_progress: "В работе", waiting_admin: "Ждут администратора",
  waiting_prepayment: "Ждут предоплату", prepaid: "Предоплачены", confirmed: "Подтверждены",
  cancelled: "Отменены", lost: "Потеряны",
};
const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Ждут подтверждения", confirmed: "Подтверждены", checked_in: "Заселены",
  checked_out: "Выехали", cancelled: "Отменены", no_show: "Не заехали",
};

function countBy<T>(items: readonly T[], getter: (item: T) => string) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = getter(item);
    if (key) map[key] = (map[key] ?? 0) + 1;
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

function bishkekDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function ManagerReportsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  const leads: LeadRow[] = [];
  const bookings: BookingRow[] = [];
  const payments: PaymentRow[] = [];
  const rooms: RoomRow[] = [];
  let occupancy: OccupancyRow[] = [];
  let readError = false;
  const today = bishkekDate();
  const tomorrow = bishkekDate(1);

  if (supabase) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("leads")
        .select("source, interest, status, booking_id")
        .is("deleted_at", null)
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data) { readError = true; break; }
      const page = data as LeadRow[];
      leads.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    if (!readError) {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("bookings")
          .select("id, status, check_in, check_out, total_amount_kgs")
          .is("deleted_at", null)
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data) { readError = true; break; }
        const page = data as BookingRow[];
        bookings.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
    }

    if (!readError) {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("booking_payments")
          .select("booking_id, amount_kgs, status")
          .is("deleted_at", null)
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data) { readError = true; break; }
        const page = data as PaymentRow[];
        payments.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
    }

    if (!readError) {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("room_units")
          .select("id, sellable_status, operational_status")
          .is("deleted_at", null)
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data) { readError = true; break; }
        const page = data as RoomRow[];
        rooms.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
    }

    if (!readError) {
      const { data, error } = await supabase
        .from("occupancy_periods")
        .select("room_unit_id, period_type, status")
        .eq("status", "active")
        .overlaps("period", `[${today},${tomorrow})`)
        .range(0, PAGE_SIZE - 1);
      if (error || !data) readError = true;
      else occupancy = data as OccupancyRow[];
    }
  }

  const activeBookings = bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status));
  const activeBookingIds = new Set(activeBookings.map((booking) => booking.id));
  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const activeConfirmedPayments = confirmedPayments.filter((payment) => activeBookingIds.has(payment.booking_id));
  const bookedTotal = activeBookings.reduce((sum, booking) => sum + Number(booking.total_amount_kgs || 0), 0);
  const paidTotal = confirmedPayments.reduce((sum, payment) => sum + Number(payment.amount_kgs || 0), 0);
  const activePaidTotal = activeConfirmedPayments.reduce((sum, payment) => sum + Number(payment.amount_kgs || 0), 0);
  const operationalOutstanding = Math.max(bookedTotal - activePaidTotal, 0);
  const convertedLeads = leads.filter((lead) => Boolean(lead.booking_id)).length;
  const conversion = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;
  const arrivalsToday = bookings.filter((booking) => booking.check_in === today && !["cancelled", "no_show"].includes(booking.status)).length;
  const departuresToday = bookings.filter((booking) => booking.check_out === today && !["cancelled", "no_show"].includes(booking.status)).length;
  const occupiedRoomIds = new Set(occupancy.filter((row) => ["booking", "hold"].includes(row.period_type)).map((row) => row.room_unit_id));
  const readyRooms = rooms.filter((room) => room.sellable_status === "active" && room.operational_status === "ready").length;
  const blockedRooms = rooms.filter((room) => room.sellable_status !== "active" || ["maintenance_required", "maintenance_in_progress", "blocked"].includes(room.operational_status)).length;

  const bySource = countBy(leads, (lead) => lead.source);
  const byInterest = countBy(leads, (lead) => lead.interest);
  const byLeadStatus = countBy(leads, (lead) => lead.status);
  const byBookingStatus = countBy(bookings, (booking) => booking.status);

  return (
    <>
      <ManagerHeader title="Аналитика" />
      <main className="space-y-6 p-4 lg:p-8">
        {!allowed ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Для аналитики нужна роль Собственник, Администратор или Менеджер.</div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Supabase Auth не настроен на этом окружении.</div>
        ) : readError ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Не удалось построить аналитику из актуальных данных. Mock-данные не используются.</div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted">Управленческий экран строится только из authoritative Supabase: CRM, брони, ручной журнал оплат, номера и фактическая занятость.</p>
              <p className="mt-1 text-xs text-muted">Сегодня по Бишкеку: {today}. Денежные показатели — по записям менеджеров, не банковская выписка.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Заявки</p><p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{leads.length}</p><p className="mt-1 text-xs text-muted">Конверсия в бронь: {conversion.toFixed(1)}%</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Активные брони</p><p className="mt-1 font-display text-3xl font-semibold text-emerald-deep">{activeBookings.length}</p><p className="mt-1 text-xs text-muted">На {money(bookedTotal)}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Зафиксировано оплат</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(paidTotal)}</p><p className="mt-1 text-xs text-muted">Вся история подтверждённых менеджерами записей</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><p className="text-sm text-muted">Операционный остаток</p><p className="mt-1 font-display text-2xl font-semibold text-emerald-deep">{money(operationalOutstanding)}</p><p className="mt-1 text-xs text-muted">Только по активным броням; не банковская сверка</p></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Заезды сегодня</p><p className="mt-1 text-2xl font-semibold text-emerald-deep">{arrivalsToday}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Выезды сегодня</p><p className="mt-1 text-2xl font-semibold text-emerald-deep">{departuresToday}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Занято/удержано сейчас</p><p className="mt-1 text-2xl font-semibold text-emerald-deep">{occupiedRoomIds.size}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Готово к продаже</p><p className="mt-1 text-2xl font-semibold text-emerald-deep">{readyRooms}</p></div>
              <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft"><p className="text-xs text-muted">Заблокировано/ремонт</p><p className="mt-1 text-2xl font-semibold text-emerald-deep">{blockedRooms}</p></div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по источникам</h2><Bars data={bySource} labels={SOURCE_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Заявки по направлениям</h2><Bars data={byInterest} labels={INTEREST_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Статусы CRM</h2><Bars data={byLeadStatus} labels={LEAD_STATUS_LABELS} /></div>
              <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h2 className="mb-4 font-display text-base font-semibold text-emerald-deep">Статусы броней</h2><Bars data={byBookingStatus} labels={BOOKING_STATUS_LABELS} /></div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
