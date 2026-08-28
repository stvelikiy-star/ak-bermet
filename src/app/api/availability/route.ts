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
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  AvailabilityHoldRpcError,
  availabilityHoldRpcHttpStatus,
  createAvailabilityHoldRpc,
  loadAuthoritativeAvailability,
} from "@/lib/supabase-admin";
import type {
  AvailabilityQuery,
  AvailabilityErrorCode,
  CreateHoldRequest,
} from "@/types/availability";

export const runtime = "nodejs";

const HOLD_CREATOR_ROLES = ["owner", "administrator", "manager"] as const;

function availabilityHoldRpcErrorResponse(code: string | undefined): {
  status: number;
  code: AvailabilityErrorCode;
  message: string;
} {
  switch (code) {
    case "AKB01":
      return { status: availabilityHoldRpcHttpStatus(code), code: "invalid_date_range", message: "Некорректный диапазон дат." };
    case "AKB02":
    case "23P01":
      return { status: availabilityHoldRpcHttpStatus(code), code: "hold_conflict", message: "Номер уже занят или удерживается на эти даты." };
    case "AKB03":
      return { status: availabilityHoldRpcHttpStatus(code), code: "invalid_room", message: "Номер не найден или недоступен." };
    default:
      return { status: availabilityHoldRpcHttpStatus(code), code: "availability_unknown", message: "Не удалось безопасно создать удержание. Повторите запрос позже." };
  }
}

function errorStatus(code: AvailabilityErrorCode): number {
  switch (code) {
    case "invalid_date":
    case "invalid_date_range":
    case "invalid_guests":
    case "invalid_room":
    case "invalid_idempotency_key":
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

// Mock availability is allowed only when explicitly selected in a local
// development/test runtime. Any non-mock runtime uses Supabase authority.
function isExplicitLocalMockAvailabilityAllowed(): boolean {
  const localRuntime =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  return localRuntime && process.env.AVAILABILITY_SOURCE === "mock";
}

// Production/non-mock availability is derived only from authoritative
// Supabase room_units + occupancy_periods, with active durable holds verified
// against their expiry. Any authority read failure fails closed.
async function loadRoomsAndOccupancy(): Promise<{
  rooms: typeof mockRooms;
  occupancy: typeof mockOccupancy;
  source: "supabase" | "mock";
}> {
  if (isExplicitLocalMockAvailabilityAllowed()) {
    return { rooms: mockRooms, occupancy: mockOccupancy, source: "mock" };
  }

  try {
    const { rooms, occupancy } = await loadAuthoritativeAvailability();
    return { rooms, occupancy, source: "supabase" };
  } catch {
    console.error("[AVAILABILITY] Authoritative Supabase read failed");
    throw new AvailabilityError(
      "availability_unknown",
      "Не удалось проверить доступность номеров. Повторите запрос позже."
    );
  }
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
  // Process-local holds belong exclusively to the explicit mock source.
  // Production occupancy already includes active durable Supabase holds.
  const allOccupancy =
    source === "mock" ? [...occupancy, ...listActiveHolds()] : occupancy;

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

// Production создаёт hold атомарно в БД; process-local store остаётся
// только для явного mock/test source.
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
  // Ключ идемпотентности обязателен: без него повторный запрос (retry
  // после таймаута, двойной клик) создаёт отдельное удержание вместо
  // возврата уже созданного (см. Codex-аудит).
  if (
    typeof body.idempotencyKey !== "string" ||
    body.idempotencyKey.trim().length === 0 ||
    body.idempotencyKey.trim().length > 200
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_idempotency_key",
        message: "Укажите корректный ключ идемпотентности (до 200 символов).",
      },
      { status: 400 }
    );
  }

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

  if (source === "supabase") {
    const staff = await getCurrentStaff();
    if (!staff) {
      return NextResponse.json(
        { ok: false, code: "unauthorized", message: "Требуется вход в систему." },
        { status: 401 }
      );
    }
    if (!hasAnyRole(staff, [...HOLD_CREATOR_ROLES])) {
      return NextResponse.json(
        { ok: false, code: "forbidden", message: "Нет доступа к удержанию номеров." },
        { status: 403 }
      );
    }

    try {
      const hold = await createAvailabilityHoldRpc({
        roomUnitId: body.roomId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        heldBy: staff.userId,
        leadId: null,
        idempotencyKey: body.idempotencyKey.trim(),
      });
      const { idempotency_key, ...publicHold } = hold;
      void idempotency_key;
      return NextResponse.json({ ok: true, hold: publicHold }, { status: 201 });
    } catch (error) {
      if (error instanceof AvailabilityHoldRpcError) {
        const mapped = availabilityHoldRpcErrorResponse(error.code);
        return NextResponse.json(
          { ok: false, code: mapped.code, message: mapped.message },
          { status: mapped.status }
        );
      }
      throw error;
    }
  }

  try {
    const hold = createHold(
      {
        roomId: body.roomId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        idempotencyKey: body.idempotencyKey.trim(),
      },
      rooms,
      occupancy
    );
    const { idempotencyKey, ...publicHold } = hold;
    void idempotencyKey;
    return NextResponse.json({ ok: true, hold: publicHold }, { status: 201 });
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
