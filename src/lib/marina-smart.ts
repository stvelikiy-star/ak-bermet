import "server-only";

import type { LeadInput } from "@/types/lead";

export const DEFAULT_MARINA_SMART_API_URL =
  "https://api-production-f1171.up.railway.app";

const REQUEST_TIMEOUT_MS = 8_000;

export type MarinaAvailabilityRoom = {
  id: string;
  code: string;
  building_or_zone?: string | null;
  floor?: string | null;
  operational_state?: string | null;
  max_capacity?: number | null;
};

export type MarinaAvailabilityResult = {
  room_type_code: string;
  room_type_name: string;
  capacity_adults: number;
  capacity_children?: number | null;
  available_count: number;
  available_rooms: MarinaAvailabilityRoom[];
  pricing?: {
    sellable?: boolean;
    total_kgs?: number | null;
    reason?: string | null;
    manager_confirmation_required?: boolean;
  };
};

export type MarinaAvailabilityResponse = {
  property: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  results: MarinaAvailabilityResult[];
  rule?: string;
};

export class MarinaSmartError extends Error {
  constructor(
    public readonly code: "UNAVAILABLE" | "REJECTED" | "INVALID_RESPONSE",
    message: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = "MarinaSmartError";
  }
}

export function marinaSmartApiUrl(): string {
  const configured = process.env.MARINA_SMART_API_URL?.trim();
  return (configured || DEFAULT_MARINA_SMART_API_URL).replace(/\/$/, "");
}

async function marinaFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${marinaSmartApiUrl()}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response;
}

export async function fetchMarinaAvailability(input: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}): Promise<MarinaAvailabilityResponse> {
  const params = new URLSearchParams({
    check_in: input.checkIn,
    check_out: input.checkOut,
    adults: String(input.adults),
    children: String(input.children),
  });

  let response: Response;
  try {
    response = await marinaFetch(
      `/api/v1/booking/check-availability?${params.toString()}`,
    );
  } catch {
    throw new MarinaSmartError(
      "UNAVAILABLE",
      "MARINA SMART временно недоступна.",
    );
  }

  if (!response.ok) {
    throw new MarinaSmartError(
      "REJECTED",
      "MARINA SMART не смогла проверить доступность.",
      response.status >= 500 ? 503 : 422,
    );
  }

  let payload: MarinaAvailabilityResponse;
  try {
    payload = (await response.json()) as MarinaAvailabilityResponse;
  } catch {
    throw new MarinaSmartError(
      "INVALID_RESPONSE",
      "MARINA SMART вернула некорректный ответ.",
    );
  }

  if (!payload || !Array.isArray(payload.results)) {
    throw new MarinaSmartError(
      "INVALID_RESPONSE",
      "MARINA SMART вернула неполный ответ.",
    );
  }

  return payload;
}

function appendPreference(
  parts: string[],
  label: string,
  enabled: boolean | undefined,
): void {
  if (enabled) parts.push(label);
}

export function buildMarinaBookingNotes(input: LeadInput): string | undefined {
  const parts: string[] = [];

  if (input.roomCategory) parts.push(`Категория с сайта: ${input.roomCategory}`);
  if (input.childrenAges) parts.push(`Возраст детей: ${input.childrenAges}`);
  appendPreference(parts, "Пожелание: двуспальная кровать", input.wantsDoubleBed);
  appendPreference(parts, "Пожелание: дополнительное место", input.needsExtraBed);
  appendPreference(parts, "Пожелание: Wi-Fi", input.needsWifi);
  appendPreference(parts, "Пожелание: нижний этаж", input.needsLowerFloor);
  if (input.message?.trim()) parts.push(input.message.trim());

  const text = parts.join("\n").trim();
  return text ? text.slice(0, 2_000) : undefined;
}

export async function createMarinaBookingRequest(input: LeadInput): Promise<{
  id: string;
  status: string;
  is_reservation: boolean;
}> {
  if (!input.checkIn || !input.checkOut || !input.adults) {
    throw new MarinaSmartError(
      "REJECTED",
      "Для заявки на проживание нужны даты заезда, выезда и количество взрослых.",
      422,
    );
  }

  const body = {
    guest_name: input.name,
    phone: input.phone,
    email: null,
    check_in: input.checkIn,
    check_out: input.checkOut,
    adults: input.adults,
    children: input.children ?? 0,
    room_type_code: input.roomTypeCode || null,
    source: "AK_BERMET_WEBSITE",
    notes: buildMarinaBookingNotes(input),
    landing_page: "ak-bermet",
  };

  let response: Response;
  try {
    response = await marinaFetch("/api/v1/booking/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MarinaSmartError(
      "UNAVAILABLE",
      "MARINA SMART временно недоступна. Заявка не была сохранена.",
    );
  }

  let payload: {
    id?: string;
    status?: string;
    is_reservation?: boolean;
    detail?: unknown;
  } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // Keep a sanitized public error below.
  }

  if (!response.ok || !payload.id) {
    throw new MarinaSmartError(
      "REJECTED",
      response.status === 422
        ? "Проверьте даты, количество гостей и выбранную категорию."
        : "MARINA SMART не смогла надёжно сохранить заявку.",
      response.status === 422 ? 422 : 503,
    );
  }

  return {
    id: payload.id,
    status: payload.status ?? "NEW",
    is_reservation: payload.is_reservation === true,
  };
}
