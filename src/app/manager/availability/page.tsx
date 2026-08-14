import ManagerHeader from "@/components/manager/ManagerHeader";
import {
  BookingChessboardError,
  chessboardStateForDate,
  daysBetween,
  loadBookingChessboard,
  type BookingChessboardData,
  type ChessboardState,
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

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function enumerateDates(from: string, to: string): string[] {
  const total = daysBetween(from, to);
  if (!Number.isFinite(total) || total <= 0) return [];
  return Array.from({ length: total }, (_, index) => addDays(from, index));
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

const CELL_STYLE: Record<ChessboardState, string> = {
  free: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  hold: "bg-amber-100 text-amber-800 ring-amber-200",
  booking: "bg-sky-100 text-sky-800 ring-sky-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
};

const CELL_TEXT: Record<ChessboardState, string> = {
  free: "Св",
  hold: "Уд",
  booking: "Бр",
  blocked: "Бл",
};

function ErrorPanel({ code }: { code: BookingChessboardError["code"] | "UNKNOWN" }) {
  const message =
    code === "ACCESS_DENIED"
      ? "Нет подтверждённой роли для просмотра шахматки."
      : code === "CONFIGURATION"
        ? "Supabase Auth не настроен на этом окружении. Шахматка не подменяется mock-данными."
        : code === "INVALID_RANGE"
          ? "Период должен быть от 1 до 31 дня."
          : "Не удалось безопасно прочитать актуальную занятость. Данные не подменяются mock-значениями.";

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <strong className="block">Шахматка временно недоступна</strong>
      <span>{message}</span>
    </div>
  );
}

function Chessboard({ data }: { data: BookingChessboardData }) {
  const dates = enumerateDates(data.from, data.to);
  const groups = new Map<string, typeof data.rooms>();
  for (const room of data.rooms) {
    const current = groups.get(room.building) ?? [];
    groups.set(room.building, [...current, room]);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
      <table className="min-w-max border-collapse text-xs">
        <thead className="sticky top-0 z-20 bg-cream">
          <tr className="border-b border-gold/15">
            <th className="sticky left-0 z-30 min-w-44 bg-cream px-3 py-3 text-left font-semibold text-emerald-deep">
              Номер
            </th>
            {dates.map((date) => (
              <th key={date} className="min-w-14 border-l border-gold/10 px-2 py-2 text-center font-medium text-muted">
                {shortDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...groups.entries()].map(([building, rooms]) => (
            <tr key={`group-${building}`} className="contents">
              <td colSpan={dates.length + 1} className="border-y border-gold/15 bg-emerald-deep px-3 py-2 font-semibold text-white">
                {building} · {rooms.length} ном.
              </td>
            </tr>
          )).flatMap(() => [])}
          {[...groups.entries()].flatMap(([building, rooms]) => [
            <tr key={`header-${building}`}>
              <td colSpan={dates.length + 1} className="border-y border-gold/15 bg-emerald-deep px-3 py-2 font-semibold text-white">
                {building} · {rooms.length} ном.
              </td>
            </tr>,
            ...rooms.map((room) => (
              <tr key={room.id} className="border-b border-gold/10 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                  <div className="font-semibold text-emerald-deep">№ {room.roomNumber}</div>
                  <div className="max-w-40 truncate text-[10px] text-muted" title={room.category}>
                    {room.category}
                  </div>
                  {room.operationalStatus !== "ready" ? (
                    <div className="mt-1 text-[10px] font-medium text-amber-700">{room.operationalStatus}</div>
                  ) : null}
                </td>
                {dates.map((date) => {
                  const cell = chessboardStateForDate(room, data.periods, date);
                  return (
                    <td key={`${room.id}-${date}`} className="border-l border-gold/10 p-1 text-center">
                      <span
                        className={`inline-flex h-8 w-10 items-center justify-center rounded-md font-semibold ring-1 ${CELL_STYLE[cell.state]}`}
                        title={cell.label}
                        aria-label={`${date}: ${cell.label}`}
                      >
                        {CELL_TEXT[cell.state]}
                      </span>
                    </td>
                  );
                })}
              </tr>
            )),
          ])}
        </tbody>
      </table>
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
      <ManagerHeader title="Шахматка бронирований" />
      <main className="space-y-5 p-4 lg:p-8">
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-gold/15 bg-white p-4 shadow-soft lg:flex-row lg:items-end">
          <div>
            <h1 className="font-display text-lg font-semibold text-emerald-deep">Занятость по номерам</h1>
            <p className="mt-1 text-sm text-muted">
              Источник: Supabase room_units + occupancy_periods. Mock-данные не используются.
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
            <button type="submit" className="rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white">
              Показать
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">Св — свободно</span>
          <span className="rounded-md bg-amber-100 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">Уд — удержание</span>
          <span className="rounded-md bg-sky-100 px-2.5 py-1 text-sky-800 ring-1 ring-sky-200">Бр — бронь</span>
          <span className="rounded-md bg-rose-100 px-2.5 py-1 text-rose-800 ring-1 ring-rose-200">Бл — тех. блок / стоп-продажа</span>
        </div>

        {errorCode ? <ErrorPanel code={errorCode} /> : data ? <Chessboard data={data} /> : <ErrorPanel code="UNKNOWN" />}
      </main>
    </>
  );
}
