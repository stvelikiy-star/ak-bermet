import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerStatCard from "@/components/manager/ManagerStatCard";
import LeadStatusBadge from "@/components/manager/LeadStatusBadge";
import {
  mockLeads,
  todayTasks,
  businessReminders,
} from "@/data/manager-mock";
import {
  computeStats,
  INTEREST_LABELS,
  formatDate,
} from "@/lib/manager-utils";
import {
  IconUsers,
  IconClock,
  IconGift,
  IconCheck,
  IconCalendar,
  IconShield,
} from "@/components/ui/icons";

const DemoNotice = () => (
  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    Это демо-кабинет менеджера. Настоящая авторизация будет подключена на
    следующем этапе.
  </div>
);

export default function ManagerDashboard() {
  const stats = computeStats(mockLeads);
  const recent = [...mockLeads]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <ManagerHeader title="Обзор" />
      <main className="space-y-6 p-4 lg:p-8">
        <DemoNotice />

        {/* Статистика */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ManagerStatCard label="Новые заявки" value={stats.newLeads} icon={IconUsers} />
          <ManagerStatCard label="В работе" value={stats.inProgress} icon={IconClock} />
          <ManagerStatCard
            label="Ожидают предоплату"
            value={stats.waitingPrepayment}
            icon={IconGift}
          />
          <ManagerStatCard
            label="Подтверждённые брони"
            value={stats.confirmed}
            icon={IconCheck}
          />
          <ManagerStatCard
            label="Заявки на мероприятия"
            value={stats.events}
            icon={IconCalendar}
          />
          <ManagerStatCard
            label="Сумма предоплат"
            value="—"
            icon={IconShield}
            hint="mock — появится при подключении оплат"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Последние заявки */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">
              Последние заявки
            </h2>
            <div className="overflow-hidden rounded-xl border border-gold/15 bg-white shadow-soft">
              <ul className="divide-y divide-gold/10">
                {recent.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-emerald-deep">
                        {lead.name}{" "}
                        <span className="text-xs text-muted">
                          · {INTEREST_LABELS[lead.interest]}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {lead.phone} · {formatDate(lead.createdAt)}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Задачи на сегодня */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">
              Задачи на сегодня
            </h2>
            <ul className="space-y-2.5 rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
              {todayTasks.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Важные правила */}
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-deep">
            Важные правила
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businessReminders.map((r) => (
              <div
                key={r}
                className="flex items-start gap-2.5 rounded-xl border border-gold/15 bg-white p-4 text-sm text-muted shadow-soft"
              >
                <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
