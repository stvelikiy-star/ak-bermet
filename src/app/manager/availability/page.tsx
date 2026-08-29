import ManagerHeader from "@/components/manager/ManagerHeader";
import SuperChessboard from "@/components/manager/SuperChessboard";
import {
  BookingChessboardError,
  addDays,
  daysBetween,
  loadBookingChessboard,
  type BookingChessboardData,
} from "@/lib/booking-chessboard";

export const dynamic = "force-dynamic";

function bishkekToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function ErrorPanel({ code }: { code: BookingChessboardError["code"] | "UNKNOWN" }) {
  const message =
    code === "ACCESS_DENIED"
      ? "Нет подтверждённой роли для просмотра шахматки."
      : code === "CONFIGURATION"
        ? "Supabase Auth не настроен на этом окружении. Шахматка не подменяется mock-данными."
        : code === "INVALID_RANGE"
          ? "Период должен быть от 1 до 31 дня."
          : "Не удалось безопасно прочитать актуальную занятость, клиентов или каталог услуг. Данные не подменяются mock-значениями.";

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <strong className="block">Шахматка временно недоступна</strong>
      <span>{message}</span>
    </div>
  );
}

export default async function ManagerAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = bishkekToday();
  const requestedFrom = params.from ?? today;
  const requestedTo = params.to ?? addDays(today, 14);
  const safeRange = daysBetween(requestedFrom, requestedTo);
  const from = Number.isFinite(safeRange) && safeRange >= 1 && safeRange <= 31 ? requestedFrom : today;
  const to = Number.isFinite(safeRange) && safeRange >= 1 && safeRange <= 31 ? requestedTo : addDays(today, 14);

  let data: BookingChessboardData | null = null;
  let errorCode: BookingChessboardError["code"] | "UNKNOWN" | null = null;
  try {
    data = await loadBookingChessboard(from, to);
  } catch (error) {
    errorCode = error instanceof BookingChessboardError ? error.code : "UNKNOWN";
  }

  return (
    <>
      <ManagerHeader title="SUPER шахматка" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-gold/15 bg-white p-4 shadow-soft lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">PMS / CRM</div>
            <h1 className="mt-1 font-display text-xl font-semibold text-emerald-deep">Управление бронированиями по номерам</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              Нажмите свободную дату для ручной брони. Откройте бронь для клиента, допуслуг и безопасного переноса. Источник занятости — Supabase; Google Sheets остаётся зеркалом и отчётностью.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-2" method="get">
            <label className="text-xs text-muted">
              С
              <input name="from" type="date" defaultValue={from} className="mt-1 block rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
            </label>
            <label className="text-xs text-muted">
              По
              <input name="to" type="date" defaultValue={to} className="mt-1 block rounded-lg border border-gold/20 px-3 py-2 text-sm text-emerald-deep" />
            </label>
            <button type="submit" className="rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white">Показать</button>
          </form>
        </div>

        {errorCode ? <ErrorPanel code={errorCode} /> : data ? <SuperChessboard data={data} /> : <ErrorPanel code="UNKNOWN" />}
      </main>
    </>
  );
}
