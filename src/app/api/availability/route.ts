import { NextResponse } from "next/server";
import {
  mockRooms,
  mockOccupancy,
  filterRooms,
  createHold,
  listActiveHolds,
  parseDateRange,
  parseGuests,
  AvailabilityError,
  AVAILABILITY_MESSAGE,
} from "@/lib/availability";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import {
  AvailabilityHoldRpcError,
  availabilityHoldRpcHttpStatus,
  createAvailabilityHoldRpc,
} from "@/lib/supabase-admin";
import type { AvailabilityHoldRpcClient } from "@/lib/supabase-admin";
import { getSupabasePublicClient } from "@/lib/supabase/public-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { fetchMarinaAvailability, MarinaSmartError } from "@/lib/marina-smart";
import type {
  AvailabilityItem,
  AvailabilityQuery,
  AvailabilityErrorCode,
  CreateHoldRequest,
} from "@/types/availability";

export const runtime = "nodejs";

const HOLD_CREATOR_ROLES = ["owner", "administrator", "manager"] as const;

type PublicAvailabilityRpcRow = {
  category: string;
  building: string;
  capacity: number;
  view: string | null;
  has_wifi: boolean | null;
  repair_level: string | null;
  preliminary: boolean;
};

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

function isExplicitLocalMockAvailabilityAllowed(): boolean {
  const localRuntime =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  return localRuntime && process.env.AVAILABILITY_SOURCE === "mock";
}

function availabilityErrorResponse(error: AvailabilityError) {
  return NextResponse.json(
    { ok: false, code: error.code, message: error.message },
    { status: errorStatus(error.code) }
  );
}

// Public accommodation availability is read from MARINA SMART so the website
// and hotel operations use one inventory/occupancy authority.
function matchesPublicCategory(roomTypeName: string, requested?: string): boolean {
  if (!requested?.trim()) return true;
  const name = roomTypeName.toLocaleLowerCase("ru");
  const category = requested.toLocaleLowerCase("ru");

  if (category.includes("garden")) return name.includes("garden");
  if (category.includes("полулюкс")) return name.includes("полулюкс");
  if (category === "люкс") return name.includes("люкс") && !name.includes("полулюкс");
  if (category.includes("стандарт")) return name.includes("стандарт");
  if (category.includes("семейн")) return name.includes("семейн");
  if (category.includes("коттедж") || category.includes("сруб")) {
    return name.includes("коттедж") || name.includes("сруб");
  }
  return name.includes(category);
}

function marinaCapacity(item: {
  capacity_adults: number;
  capacity_children?: number | null;
  available_rooms: Array<{ max_capacity?: number | null }>;
}): number {
  const explicit = item.available_rooms
    .map((room) => room.max_capacity)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (explicit.length) return Math.max(...explicit);
  return item.capacity_adults + Math.max(0, item.capacity_children ?? 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let guests: number | undefined;
  const query: AvailabilityQuery = {
    checkIn: searchParams.get("checkIn") ?? undefined,
    checkOut: searchParams.get("checkOut") ?? undefined,
    category: searchParams.get("category") ?? undefined,
  };

  try {
    guests = parseGuests(searchParams.get("guests"));
    query.guests = guests;
    parseDateRange(query.checkIn, query.checkOut);
  } catch (error) {
    if (error instanceof AvailabilityError) return availabilityErrorResponse(error);
    throw error;
  }

  if (isExplicitLocalMockAvailabilityAllowed()) {
    const allOccupancy = [...mockOccupancy, ...listActiveHolds()];
    try {
      const items = filterRooms(mockRooms, query, allOccupancy);
      return NextResponse.json({
        ok: true,
        message: AVAILABILITY_MESSAGE,
        query,
        items,
        source: "mock",
      });
    } catch (error) {
      if (error instanceof AvailabilityError) return availabilityErrorResponse(error);
      throw error;
    }
  }

  if (!query.checkIn || !query.checkOut) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_date_range",
        message: "Укажите даты заезда и выезда.",
      },
      { status: 400 },
    );
  }

  try {
    const marina = await fetchMarinaAvailability({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      adults: guests ?? 1,
      children: 0,
    });

    const items: AvailabilityItem[] = marina.results
      .filter(
        (item) =>
          item.available_count > 0 &&
          item.pricing?.sellable === true &&
          matchesPublicCategory(item.room_type_name, query.category),
      )
      .map((item) => {
        const buildings = Array.from(
          new Set(
            item.available_rooms
              .map((room) => room.building_or_zone?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        );

        return {
          roomTypeCode: item.room_type_code,
          category: item.room_type_name,
          building:
            buildings.length === 0
              ? "AK BERMET"
              : buildings.length === 1
                ? buildings[0]
                : buildings.join(" / "),
          capacity: marinaCapacity(item),
          preliminary: true as const,
        };
      });

    return NextResponse.json({
      ok: true,
      message:
        "Доступность и цены проверены в MARINA SMART. Конкретный номер и бронь подтверждает администратор.",
      query,
      items,
      source: "marina-smart",
    });
  } catch (error) {
    console.error("[AVAILABILITY] MARINA SMART availability failed");
    const status =
      error instanceof MarinaSmartError && error.status === 422 ? 422 : 503;
    return NextResponse.json(
      {
        ok: false,
        code: "availability_unknown",
        message:
          "Не удалось проверить доступность номеров в MARINA SMART. Повторите запрос позже.",
      },
      { status },
    );
  }
}

// Production creates a hold through the existing authenticated RPC. The RPC
// receives the real staff JWT via the cookie-bound server client; service-role
// bypass is intentionally not used.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        code: "legacy_booking_authority_disabled",
        message:
          "Удержания и новые бронирования ведутся в MARINA SMART. Используйте систему управления отелем.",
      },
      { status: 409 },
    );
  }

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
      { ok: false, code: "invalid_date_range", message: "Нужно указать даты заезда и выезда." },
      { status: 400 }
    );
  }
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

  try {
    parseDateRange(body.checkIn, body.checkOut);
  } catch (error) {
    if (error instanceof AvailabilityError) return availabilityErrorResponse(error);
    throw error;
  }

  if (!isExplicitLocalMockAvailabilityAllowed()) {
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

    const serverClient = await createSupabaseServerClient();
    if (!serverClient) {
      return NextResponse.json(
        { ok: false, code: "availability_unknown", message: "Сервис временно недоступен." },
        { status: 503 }
      );
    }

    try {
      const hold = await createAvailabilityHoldRpc(
        {
          roomUnitId: body.roomId,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          heldBy: staff.userId,
          leadId: null,
          idempotencyKey: body.idempotencyKey.trim(),
        },
        serverClient as unknown as AvailabilityHoldRpcClient
      );
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
      mockRooms,
      mockOccupancy
    );
    const { idempotencyKey, ...publicHold } = hold;
    void idempotencyKey;
    return NextResponse.json({ ok: true, hold: publicHold }, { status: 201 });
  } catch (error) {
    if (error instanceof AvailabilityError) return availabilityErrorResponse(error);
    throw error;
  }
}
