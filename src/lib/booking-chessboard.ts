import type {
  ChessboardPeriod,
  ChessboardRoom,
} from "@/lib/booking-chessboard-rules";

export {
  addDays,
  chessboardStateForDate,
  daysBetween,
  findPeriodForDate,
  parseDateRange,
  periodOverlapsDate,
  isRoomOperationallyBlocked,
  isIsoDate,
} from "@/lib/booking-chessboard-rules";

export type {
  ChessboardBookingService,
  ChessboardBookingSummary,
  ChessboardPeriod,
  ChessboardRoom,
  ChessboardState,
} from "@/lib/booking-chessboard-rules";

export interface BookingServiceOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly pricingMode: "fixed" | "manual";
  readonly priceKgs: number | null;
  readonly unitLabel: string;
}

export interface BookingChessboardData {
  readonly rooms: readonly ChessboardRoom[];
  readonly periods: readonly ChessboardPeriod[];
  readonly serviceCatalog: readonly BookingServiceOption[];
  readonly from: string;
  readonly to: string;
}

export class BookingChessboardError extends Error {
  constructor(
    public readonly code:
      | "ACCESS_DENIED"
      | "CONFIGURATION"
      | "READ_FAILED"
      | "INVALID_RANGE",
  ) {
    super(code);
    this.name = "BookingChessboardError";
  }
}
