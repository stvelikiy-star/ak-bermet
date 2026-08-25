export type ChessboardState = "free" | "hold" | "booking" | "blocked";

export interface ChessboardRoom {
  readonly id: string;
  readonly building: string;
  readonly roomNumber: string;
  readonly floor: number | null;
  readonly category: string;
  readonly sellableStatus: string;
  readonly operationalStatus: string;
}

export interface ChessboardPeriod {
  readonly id: string;
  readonly roomId: string;
  readonly start: string;
  readonly end: string;
  readonly state: Exclude<ChessboardState, "free">;
  readonly label: string;
  readonly sourceId: string | null;
}

const OPERATIONALLY_BLOCKED = new Set([
  "maintenance_required",
  "maintenance_in_progress",
  "blocked",
]);

export function parseDateRange(value: string): { start: string; end: string } | null {
  const match = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(value);
  if (!match) return null;
  return isIsoDate(match[1]) && isIsoDate(match[2])
    ? { start: match[1], end: match[2] }
    : null;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function daysBetween(from: string, to: string): number {
  if (!isIsoDate(from) || !isIsoDate(to)) return Number.NaN;
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function isRoomOperationallyBlocked(
  room: Pick<ChessboardRoom, "sellableStatus" | "operationalStatus">,
): boolean {
  return (
    room.sellableStatus !== "active" ||
    OPERATIONALLY_BLOCKED.has(room.operationalStatus)
  );
}

export function periodOverlapsDate(
  period: Pick<ChessboardPeriod, "start" | "end">,
  date: string,
): boolean {
  return period.start <= date && date < period.end;
}

export function chessboardStateForDate(
  room: ChessboardRoom,
  periods: readonly ChessboardPeriod[],
  date: string,
): { state: ChessboardState; label: string } {
  if (isRoomOperationallyBlocked(room)) {
    return { state: "blocked", label: "Технически заблокирован" };
  }

  const active = periods.find(
    (period) =>
      period.roomId === room.id && periodOverlapsDate(period, date),
  );
  if (!active) return { state: "free", label: "Свободно" };
  return { state: active.state, label: active.label };
}
