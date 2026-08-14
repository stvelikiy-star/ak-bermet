import Link from "next/link";
import {
  loadBookingChessboard,
  type ChessboardOccupancy,
  type ChessboardState,
} from "@/lib/booking-chessboard";

const DAYS = 21;
const STATE_LABELS: Record<ChessboardState, string> = {
  free: "Свободно",
  hold: "Удержание",
  occupied: "Бронь",
  blocked: "Блок",
};

const STATE_CLASS: Record<ChessboardState, string> = {
  free: "bg-white text-emerald-deep/35",
  hold: "bg-amber-100 text-amber-900",
  occupied: "bg-emerald-deep text-white",
  blocked: "bg-rose-100 text-rose-900",
};

function todayBishkek(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function validDate(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function stateForDate(
  occupancies: ChessboardOccupancy[],
  date: string,
): { state: ChessboardState; label: string } {
  const item = occupancies.find((entry) => entry.start <= date && date < entry.endExclusive);
  return item ? { state: item.state, label: item.label } : { state: "free", label: "Свободно" };
}

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function BookingChessboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const params = await searchParams;
  const start = validDate(params.start) ?? todayBishkek();
  const endExclusive = addDays(start, DAYS);
  const dates = Array.from({ length: DAYS }, (_, index) => addDays(start, index));
  const data = await loadBookingChessboard(start, endExclusive);

  const groups = new Map<string, typeof data.rooms>();
  for (const room of data.rooms) {
    const rooms = groups.get(room.buildingName) ?? [];
    rooms.push(room);
    groups.set(room.buildingName, rooms);
  }

  const previous = addDays(start, -DAYS);
  const next = addDays(start, DAYS);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald">AK BERMET CRM</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-emerald-deep">Шахматка бронирований</h1>
            <p className="mt-2 text-sm text-emerald-deep/60">
              {data.rooms.length} номеров · {dayLabel(start)}–{dayLabel(addDays(endExclusive, -1))}. Источник: Supabase room_units + occupancy_periods.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/manager/chessboard?start=${previous}`} className="rounded-xl border border-emerald-deep/15 bg-white px-4 py-2 text-sm font-medium text-emerald-deep">← 21 день</Link>
            <Link href="/manager/chessboard" className="rounded-xl border border-emerald-deep/15 bg-white px-4 py-2 text-sm font-medium text-emerald-deep">Сегодня</Link>
            <Link href={`/manager/chessboard?start=${next}`} className="rounded-xl bg-emerald-deep px-4 py-2 text-sm font-medium text-white">21 день →</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(STATE_LABELS) as ChessboardState[]).map((state) => (
            <span key={state} className={`rounded-full px-3 py-1.5 ${STATE_CLASS[state]}`}>{STATE_LABELS[state]}</span>
          ))}
        </div>

        {data.rooms.length === 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            Шахматка не получила доступ к номерному фонду. Проверьте Supabase Auth/RLS и runtime environment; mock-данные не подставляются.
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-emerald-deep/10 bg-white shadow-sm">
            <table className="min-w-max border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th className="sticky left-0 z-30 min-w-44 border-b border-r border-emerald-deep/10 bg-white px-3 py-3 text-left font-semibold text-emerald-deep">Корпус / номер</th>
                  {dates.map((date) => (
                    <th key={date} className="min-w-24 border-b border-r border-emerald-deep/10 px-2 py-3 text-center font-medium text-emerald-deep/70">{dayLabel(date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ru")).map(([building, rooms]) => (
                  <FragmentGroup key={building} building={building} rooms={rooms} dates={dates} occupancies={data.occupancies} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-emerald-deep/50">
          Реальные брони будут внесены вручную при сдаче. Шахматка не создаёт и не изменяет бронирования — она показывает текущее авторитетное состояние CRM.
        </p>
      </div>
    </main>
  );
}

function FragmentGroup({
  building,
  rooms,
  dates,
  occupancies,
}: {
  building: string;
  rooms: Array<{ id: string; roomNumber: string }>;
  dates: string[];
  occupancies: ChessboardOccupancy[];
}) {
  return (
    <>
      <tr>
        <td colSpan={dates.length + 1} className="border-b border-emerald-deep/10 bg-beige px-3 py-2 font-semibold text-emerald-deep">{building} · {rooms.length}</td>
      </tr>
      {rooms.map((room) => {
        const roomOccupancies = occupancies.filter((item) => item.roomUnitId === room.id);
        return (
          <tr key={room.id}>
            <th className="sticky left-0 z-10 border-b border-r border-emerald-deep/10 bg-white px-3 py-2 text-left font-medium text-emerald-deep">№ {room.roomNumber}</th>
            {dates.map((date) => {
              const cell = stateForDate(roomOccupancies, date);
              return (
                <td key={date} title={`${date}: ${cell.label}`} className={`border-b border-r border-emerald-deep/10 px-2 py-2 text-center ${STATE_CLASS[cell.state]}`}>
                  <span className="block max-w-20 truncate">{cell.state === "free" ? "·" : cell.label}</span>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
