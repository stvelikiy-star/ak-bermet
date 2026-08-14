import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerStatCard from "@/components/manager/ManagerStatCard";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  IconUsers,
  IconClock,
  IconGift,
  IconCheck,
  IconCalendar,
  IconShield,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

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

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  waiting_admin: "Ждёт администратора",
  waiting_prepayment: "Ждёт предоплату",
  prepaid: "Предоплачено",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  lost: "Потеряна",
};

interface RecentLead {
  id: string;
  lead_number: string;
  name: string;
  phone: string;
  interest: string;
  status: string;
  created_at: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bishkek",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-emerald-deep ring-1 ring-gold/15">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AccessPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  );
}

export default async function ManagerDashboard() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  let readError = false;
  let recent: RecentLead[] = [];
  let newLeads = 0;
  let inProgress = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let cleaningOpen = 0;
  let blockingRepairs = 0;

  if (supabase) {
    const [
      recentResult,
      newResult,
      progressResult,
      pendingResult,
      confirmedResult,
      cleaningResult,
      maintenanceResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, lead_number, name, phone, interest, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "new"),
      supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "in_progress"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pending_confirmation"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "confirmed"),
      supabase.from("cleaning_tasks").select("id", { count: "exact", head: true }).not("status", "in", "(completed,cancelled)"),
      supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("blocks_room", true).not("status", "in", "(completed,closed,cancelled)"),
    ]);

    const results = [recentResult, newResult, progressResult, pendingResult, confirmedResult, cleaningResult, maintenanceResult];
    readError = results.some((result) => Boolean(result.error));
    if (!readError) {
      recent = (recentResult.data ?? []) as RecentLead[];
      newLeads = newResult.count ?? 0;
      inProgress = progressResult.count ?? 0;
      pendingBookings = pendingResult.count ?? 0;
      confirmedBookings = confirmedResult.count ?? 0;
      cleaningOpen = cleaningResult.count ?? 0;
      blockingRepairs = maintenanceResult.count ?? 0;
    }
  }

  return (
    <>
      <ManagerHeader title="Обзор" />
      <main className="space-y-6 p-4 lg:p-8">
        {!allowed ? (
          <AccessPanel>Для обзора CRM нужна роль Собственник, Администратор или Менеджер.</AccessPanel>
        ) : !supabase ? (
          <AccessPanel>Supabase Auth не настроен на этом окружении.</AccessPanel>
        ) : readError ? (
          <AccessPanel>Не удалось безопасно прочитать актуальные данные CRM. Mock-данные не используются.</AccessPanel>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ManagerStatCard label="Новые заявки" value={newLeads} icon={IconUsers} />
              <ManagerStatCard label="Заявки в работе" value={inProgress} icon={IconClock} />
              <ManagerStatCard label="Брони ждут подтверждения" value={pendingBookings} icon={IconGift} />
              <ManagerStatCard label="Подтверждённые брони" value={confirmedBookings} icon={IconCheck} />
              <ManagerStatCard label="Открытые уборки" value={cleaningOpen} icon={IconCalendar} />
              <ManagerStatCard label="Блокирующие ремонты" value={blockingRepairs} icon={IconShield} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">Последние заявки</h2>
                <div className="overflow-hidden rounded-xl border border-gold/15 bg-white shadow-soft">
                  {recent.length === 0 ? (
                    <p className="p-5 text-sm text-muted">Заявок пока нет.</p>
                  ) : (
                    <ul className="divide-y divide-gold/10">
                      {recent.map((lead) => (
                        <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-emerald-deep">
                              {lead.name} <span className="text-xs text-muted">· {INTEREST_LABELS[lead.interest] ?? lead.interest}</span>
                            </p>
                            <p className="text-xs text-muted">{lead.lead_number} · {lead.phone} · {formatDate(lead.created_at)}</p>
                          </div>
                          <StatusBadge status={lead.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">Операционный контроль</h2>
                <div className="space-y-2.5 rounded-xl border border-gold/15 bg-white p-4 shadow-soft text-sm text-muted">
                  <p>• Все брони создаются через защищённый booking-контур и сразу попадают в шахматку.</p>
                  <p>• Номер с блокирующим ремонтом не должен продаваться до завершения работ и требуемой проверки.</p>
                  <p>• Фактические платежи пока не хранятся отдельной payment-таблицей; CRM показывает только сумму брони и требуемые 20%.</p>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
