import { NextResponse } from "next/server";
import {
  mockRooms,
  mockOccupancy,
  filterRooms,
  createHold,
  listActiveHolds,
  parseGuests,
  AvailabilityError,
  AVAILABILITY_MESSAGE,
} from "@/lib/availability";
import {
  isGoogleSheetsEnabled,
  getRoomsFromSheet,
  getOccupancyFromSheet,
} from "@/lib/google-sheets";
import type {
  AvailabilityQuery,
  AvailabilityErrorCode,
  CreateHoldRequest,
} from "@/types/availability";

export const runtime = "nodejs";

function errorStatus(code: AvailabilityErrorCode): number {
  switch (code) {
    case "invalid_date":
    case "invalid_date_range":
    case "invalid_guests":
    case "invalid_room":
      return 400;
    case "hold_conflict":
    case "room_unavailable":
    case "idempotency_conflict":
      return 409;
    case "availability_unknown":
      return 503;
    default:
      return 400;
  }
}

// Загружает номера и занятость. Если реальный номерной фонд доступен, но
// занятость по нему прочитать не удалось, НЕ считаем номера свободными —
// иначе доступность и удержания строились бы на неполных данных (fail-open,
// см. Codex-аудит). В этом случае бросаем явную ошибку availability_unknown.
async function loadRoomsAndOccupancy(): Promise<{
  rooms: typeof mockRooms;
  occupancy: typeof mockOccupancy;
  source: "sheets" | "mock";
}> {
  if (isGoogleSheetsEnabled()) {
    const [roomsResult, occupancyResult] = await Promise.allSettled([
      getRoomsFromSheet(),
      getOccupancyFromSheet(),
    ]);
    if (roomsResult.status === "rejected") {
      console.error(
        "[AVAILABILITY] Room inventory read failed:",
        roomsResult.reason
      );
      throw new AvailabilityError(
        "availability_unknown",
        "Не удалось прочитать номерной фонд. Повторите запрос позже."
      );
    }
    const sheetRooms = roomsResult.value;
    if (sheetRooms.length > 0) {
      if (occupancyResult.status === "rejected") {
        console.error(
          "[AVAILABILITY] Occupancy read failed while real rooms are in use:",
          occupancyResult.reason
        );
        throw new AvailabilityError(
          "availability_unknown",
          "Не удалось проверить занятость номеров. Повторите запрос позже."
        );
      }
      return { rooms: sheetRooms, occupancy: occupancyResult.value, source: "sheets" };
    }
  }
  return { rooms: mockRooms, occupancy: mockOccupancy, source: "mock" };
}

// Предварительная проверка наличия. Финальное наличие всегда подтверждает
// администратор — отдаём только осторожные варианты, без статусов «свободно».
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let guests: number | undefined;
  try {
    guests = parseGuests(searchParams.get("guests"));
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }

  const query: AvailabilityQuery = {
    checkIn: searchParams.get("checkIn") ?? undefined,
    checkOut: searchParams.get("checkOut") ?? undefined,
    guests,
    category: searchParams.get("category") ?? undefined,
  };

  let rooms, occupancy, source;
  try {
    ({ rooms, occupancy, source } = await loadRoomsAndOccupancy());
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }
  const allOccupancy = [...occupancy, ...listActiveHolds()];

  let items;
  try {
    items = filterRooms(rooms, query, allOccupancy);
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }

  return NextResponse.json({
    ok: true,
    message: AVAILABILITY_MESSAGE,
    query,
    items,
    source,
  });
}

// Создаёт 60-минутное удержание номера на выбранные даты. Атомарно
// защищает от двойного бронирования в пределах текущего процесса.
export async function POST(request: Request) {
  let body: Partial<CreateHoldRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_date", message: "Некорректное тело запроса." },
      { status: 400 }
    );
  }

  if (!body.roomId || typeof body.roomId !== "string") {
    return NextResponse.json(
      { ok: false, code: "invalid_room", message: "Не указан номер (roomId)." },
      { status: 400 }
    );
  }
  if (!body.checkIn || !body.checkOut) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_date_range",
        message: "Нужно указать даты заезда и выезда.",
      },
      { status: 400 }
    );
  }

  let rooms, occupancy;
  try {
    ({ rooms, occupancy } = await loadRoomsAndOccupancy());
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }

  try {
    const hold = createHold(
      {
        roomId: body.roomId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        manager: body.manager,
        idempotencyKey:
          typeof body.idempotencyKey === "string"
            ? body.idempotencyKey
            : undefined,
      },
      rooms,
      occupancy
    );
    return NextResponse.json({ ok: true, hold }, { status: 201 });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }
}
