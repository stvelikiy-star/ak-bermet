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

// Public production availability is exposed by a narrow SECURITY DEFINER RPC.
// The publishable key is safe to ship and cannot bypass the RPC/table ACLs.
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

  const publicClient = getSupabasePublicClient();
  const { data, error } = await publicClient.rpc("fn_public_availability", {
    p_check_in: query.checkIn ?? null,
    p_check_out: query.checkOut ?? null,
    p_guests: guests ?? 1,
    p_category: query.category?.trim() || null,
  });

  if (error || !data) {
    console.error("[AVAILABILITY] Public Supabase RPC failed", error?.code ?? "unknown");
    return NextResponse.json(
      {
        ok: false,
        code: "availability_unknown",
        message: "Не удалось проверить доступность номеров. Повторите запрос позже.",
      },
      { status: 503 }
    );
  }

  const items: AvailabilityItem[] = (data as PublicAvailabilityRpcRow[]).map((row) => ({
    category: row.category,
    building: row.building,
    capacity: row.capacity,
    view: row.view ?? undefined,
    hasWifi: row.has_wifi ?? undefined,
    repairLevel: row.repair_level ?? undefined,
    preliminary: true,
  }));

  return NextResponse.json({
    ok: true,
    message: AVAILABILITY_MESSAGE,
    query,
    items,
    source: "supabase",
  });
}

// Production creates a hold through the existing authenticated RPC. The RPC
// receives the real staff JWT via the cookie-bound server client; service-role
// bypass is intentionally not used.
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
