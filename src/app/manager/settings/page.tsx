import ManagerHeader from "@/components/manager/ManagerHeader";
import { SITE } from "@/data/site";
import { STAFF_SLOTS, STAFF_SLOT_TOTAL } from "@/data/staff-slots";
import { ROLE_LABELS, type RoleName } from "@/types/auth";
import { isGoogleSheetsEnabled } from "@/lib/google-sheets";
import { getAIProviderName, isRealAIEnabled } from "@/lib/ai/providers";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gold/10 py-2.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-emerald-deep">{value}</dd>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-gray-300"}`} />
      {label}
    </span>
  );
}

const ROLE_ORDER: RoleName[] = ["owner", "administrator", "manager", "housekeeping", "technician"];

export default function ManagerSettingsPage() {
  const sheets = isGoogleSheetsEnabled();
  const ai = getAIProviderName();
  const realAI = isRealAIEnabled();

  return (
    <>
      <ManagerHeader title="Настройки" />
      <main className="space-y-6 p-4 lg:p-8">
        <p className="text-sm text-muted">Read-only. Системные изменения выполняются только через разрешённый административный контур.</p>

        <section className="rounded-xl border border-gold/15 bg-white p-6 shadow-soft">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-emerald-deep">Сотрудники и уровни доступа</h2>
              <p className="mt-1 text-sm text-muted">
                {STAFF_SLOT_TOTAL} рабочих слотов. До финальной сдачи используются номерные обозначения без выдуманных ФИО, email и паролей.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              17 слотов
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {STAFF_SLOTS.map((slot) => (
              <article key={slot.id} className="rounded-xl border border-gold/10 bg-cream/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-emerald-deep">{slot.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-gold/15">
                    {ROLE_LABELS[slot.role]}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-emerald-deep">
                  {slot.capabilities.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {slot.restrictions.length ? (
                  <div className="mt-3 border-t border-gold/10 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Ограничения</p>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-muted">
                      {slot.restrictions.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Номерные слоты описывают рабочие места и права. Реальные Supabase Auth-пользователи не создаются автоматически; при сдаче номерной слот можно привязать к фактическому сотруднику через утверждённый admin flow без изменения модели доступа.
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-gold/15 text-muted">
                <tr>
                  <th className="px-3 py-2">Роль</th>
                  <th className="px-3 py-2">Что разрешено</th>
                  <th className="px-3 py-2">Ключевое ограничение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {ROLE_ORDER.map((role) => {
                  const slot = STAFF_SLOTS.find((item) => item.role === role)!;
                  return (
                    <tr key={role}>
                      <td className="px-3 py-3 font-semibold text-emerald-deep">{ROLE_LABELS[role]}</td>
                      <td className="px-3 py-3 text-muted">{slot.capabilities.join(" · ")}</td>
                      <td className="px-3 py-3 text-muted">
                        {slot.restrictions.length ? slot.restrictions.join(" · ") : "Полный операционный доступ в рамках owner-политик"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gold/15 bg-white p-6 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-emerald-deep">
            Контакты
          </h2>
          <dl>
            <Row label="Главный WhatsApp" value={SITE.phoneDisplay} />
            <Row label="Email" value={SITE.email} />
            <Row label="Адрес" value={SITE.address} />
            <Row label="Источники" value={SITE.springsPhoneDisplay} />
            <Row label="2GIS" value={SITE.mapUrl} />
          </dl>
        </section>

        <section className="rounded-xl border border-gold/15 bg-white p-6 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-emerald-deep">
            Параметры бронирования
          </h2>
          <dl>
            <Row label="Предоплата" value="20%" />
            <Row label="Заезд" value="13:00" />
            <Row label="Выезд" value="11:00" />
            <Row
              label="Отмена / возврат"
              value="Не утверждено — старые 14+/7–14/<7 правила не применять"
            />
          </dl>
        </section>

        <section className="rounded-xl border border-gold/15 bg-white p-6 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-emerald-deep">
            Интеграции
          </h2>
          <dl>
            <Row label="Авторизация менеджера" value="Supabase Auth" />
            <Row
              label="Google Sheets"
              value={sheets ? "Подключено" : "Отложено; Supabase остаётся источником истины"}
            />
            <Row
              label="AI-провайдер"
              value={realAI ? `${ai} (real)` : `${ai} (mock)`}
            />
            <Row label="FreedomPay" value="Не подключено" />
            <Row label="1С" value="Не подключено" />
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <StatusDot ok={sheets} label="Sheets" />
            <StatusDot ok={realAI} label="Real AI" />
            <StatusDot ok={false} label="FreedomPay" />
            <StatusDot ok={false} label="1С" />
          </div>
        </section>
      </main>
    </>
  );
}
