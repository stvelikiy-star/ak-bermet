import { NextResponse } from "next/server";
import {
  mockRooms,
  filterRooms,
  AVAILABILITY_MESSAGE,
} from "@/lib/availability";
import {
  isGoogleSheetsEnabled,
  getRoomsFromSheet,
  getOccupancyFromSheet,
} from "@/lib/google-sheets";
import type { AvailabilityQuery } from "@/types/availability";

export const runtime = "nodejs";

// Предварительная проверка наличия. Финальное наличие всегда подтверждает
// администратор — отдаём только осторожные варианты, без статусов «свободно».
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const guestsRaw = searchParams.get("guests");
  const guests = guestsRaw ? Number(guestsRaw) : undefined;

  const query: AvailabilityQuery = {
    checkIn: searchParams.get("checkIn") ?? undefined,
    checkOut: searchParams.get("checkOut") ?? undefined,
    guests: Number.isFinite(guests) ? guests : undefined,
    category: searchParams.get("category") ?? undefined,
  };

  let rooms = mockRooms;
  let source: "sheets" | "mock" = "mock";

  if (isGoogleSheetsEnabled()) {
    try {
      const sheetRooms = await getRoomsFromSheet();
      // Занятость зарезервирована под Stage 06 (финальная проверка наличия).
      await getOccupancyFromSheet();
      if (sheetRooms.length > 0) {
        rooms = sheetRooms;
        source = "sheets";
      }
    } catch (error) {
      console.error("[AVAILABILITY] Sheets read failed, using mock:", error);
    }
  }

  const items = filterRooms(rooms, query);

  return NextResponse.json({
    ok: true,
    message: AVAILABILITY_MESSAGE,
    query,
    items,
    source,
  });
}
