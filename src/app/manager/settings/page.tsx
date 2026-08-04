import ManagerHeader from "@/components/manager/ManagerHeader";
import { SITE } from "@/data/site";
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

export default function ManagerSettingsPage() {
  const sheets = isGoogleSheetsEnabled();
  const ai = getAIProviderName();
  const realAI = isRealAIEnabled();

  return (
    <>
      <ManagerHeader title="Настройки" />
      <main className="space-y-6 p-4 lg:p-8">
        <p className="text-sm text-muted">Read-only. Редактирование появится позже.</p>

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
              label="Отмена"
              value="14+ дн. — 100%, 7–14 дн. — 50%, менее 7 дн. — сутки"
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
              value={sheets ? "Подключено" : "Выключено (mock)"}
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
