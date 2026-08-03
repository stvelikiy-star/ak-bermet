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
  isLocalMockAvailabilityAllowed,
  getRoomsFromSheet,
  getOccupancyFromSheet,
} from "@/lib/google-sheets";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  AvailabilityHoldRpcError,
  OwnerActionRequiredError,
  availabilityHoldRpcHttpStatus,
  listActiveAvailabilityHolds,
  mapOccupancyToInventoryRoomIds,
  syncSheetsBookingsAndCreateAvailabilityHold,
} from "@/lib/supabase-admin";
import type {
  AvailabilityQuery,
  AvailabilityErrorCode,
  CreateHoldRequest,
} from "@/types/availability";

export const runtime = "nodejs";

const HOLD_CREATOR_ROLES = ["owner", "administrator", "manager"] as const;

function ownerActionRequiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: "OWNER_ACTION_REQUIRED",
      message:
        "Для синхронизации занятости не хватает однозначных идентификаторов или версии данных. Обратитесь к владельцу.",
    },
    { status: 503 }
  );
}

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

// Загружает номера и занятость. Если реальный номерной фонд доступен, но
// занятость по нему прочитать не удалось, НЕ считаем номера свободными —
// иначе доступность и удержания строились бы на неполных данных (fail-open,
// см. Codex-аудит). В этом случае бросаем явную ошибку availability_unknown.
async function loadRoomsAndOccupancy(): Promise<{
  rooms: typeof mockRooms;
  occupancy: typeof mockOccupancy;
  sheetsOccupancy: typeof mockOccupancy;
  source: "sheets" | "mock";
}> {
  if (isGoogleSheetsEnabled()) {
    const [roomsResult, occupancyResult, holdsResult] = await Promise.allSettled([
      getRoomsFromSheet(),
      getOccupancyFromSheet(),
      listActiveAvailabilityHolds(),
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
    if (occupancyResult.status === "rejected") {
      console.error(
        "[AVAILABILITY] Occupancy read failed:",
        occupancyResult.reason
      );
      throw new AvailabilityError(
        "availability_unknown",
        "Не удалось проверить занятость номеров. Повторите запрос позже."
      );
    }
    if (holdsResult.status === "rejected") {
      console.error("[AVAILABILITY] Durable holds read failed");
      throw new AvailabilityError(
        "availability_unknown",
        "Не удалось проверить удержания номеров. Повторите запрос позже."
      );
    }
    // Реальный номерной фонд настроен — используем его как есть, даже если
    // лист пуст. Подмена fabricated mock-номерами здесь была бы fail-open:
    // клиент получил бы выдуманные варианты вместо честного пустого списка.
    const occupancy = [
      ...occupancyResult.value,
      ...holdsResult.value.map((hold) => ({
        id: hold.id,
        roomId: hold.room_unit_id,
        checkIn: hold.check_in,
        checkOut: hold.check_out,
        status: "pre_hold" as const,
        expiresAt: hold.expires_at,
        source: "supabase",
      })),
    ];
    return {
      rooms: roomsResult.value,
      occupancy: mapOccupancyToInventoryRoomIds(occupancy, roomsResult.value),
      sheetsOccupancy: occupancyResult.value,
      source: "sheets",
    };
  }
  if (!isLocalMockAvailabilityAllowed()) {
    throw new AvailabilityError(
      "availability_unknown",
      "Источник доступности не настроен. Обратитесь к администратору."
    );
  }
  return {
    rooms: mockRooms,
    occupancy: mockOccupancy,
    sheetsOccupancy: [],
    source: "mock",
  };
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
    if (error instanceof OwnerActionRequiredError) {
      return ownerActionRequiredResponse();
    }
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

  let rooms, occupancy, sheetsOccupancy, source;
  try {
    ({ rooms, occupancy, sheetsOccupancy, source } =
      await loadRoomsAndOccupancy());
  } catch (error) {
    if (error instanceof OwnerActionRequiredError) {
      return ownerActionRequiredResponse();
    }
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: errorStatus(error.code) }
      );
    }
    throw error;
  }

  if (source === "sheets") {
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
      const hold = await syncSheetsBookingsAndCreateAvailabilityHold({
        externalRoomId: body.roomId,
        rooms,
        occupancy: sheetsOccupancy,
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
      if (error instanceof OwnerActionRequiredError) {
        return ownerActionRequiredResponse();
      }
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
