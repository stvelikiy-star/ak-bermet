import { ROLE_LABELS } from "@/types/auth";
import {
  STAFF_ROLE_CAPABILITIES,
  STAFF_SLOTS,
  type StaffCapability,
} from "@/lib/staff-role-matrix";

const CAPABILITY_LABELS: Record<StaffCapability, string> = {
  overview: "Обзор",
  crm: "CRM и заявки",
  customers: "Клиенты",
  bookings: "Бронирования",
  availability: "Шахматка и занятость",
  payments: "Оплаты",
  reports: "Отчёты",
  staff_assignments: "Назначения сотрудников",
  operations: "Уборка и ремонт",
  inspections: "Проверки",
  cleaning_assigned: "Только назначенные уборки",
  maintenance_assigned: "Только назначенные ремонты",
  settings: "Настройки",
};

export default function StaffRolesPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-medium text-emerald">AK BERMET CRM</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-emerald-deep">
            Сотрудники и доступы
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-emerald-deep/65">
            Рабочие слоты без персональных данных. Реальные Auth-пользователи создаются отдельно при сдаче проекта; эта страница фиксирует утверждённые роли и границы доступа.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {STAFF_SLOTS.map((slot) => (
            <section key={slot.id} className="rounded-2xl border border-emerald-deep/10 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-emerald-deep">{slot.label}</h2>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-emerald-deep/50">
                    {ROLE_LABELS[slot.role]}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-deep/5 px-2.5 py-1 text-xs font-medium text-emerald-deep/70">
                  {slot.role}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-emerald-deep/75">
                {STAFF_ROLE_CAPABILITIES[slot.role].map((capability) => (
                  <li key={capability}>• {CAPABILITY_LABELS[capability]}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-emerald-deep/75">
          Горничные и техники не получают доступ к финансам, общему клиентскому реестру или настройкам. Их рабочий контур ограничен назначенными задачами и защищается существующими Supabase Auth/RLS правилами.
        </div>
      </div>
    </main>
  );
}
