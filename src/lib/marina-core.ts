type MarinaAvailabilityRoom = {
  id: string;
  code: string;
  building_or_zone?: string | null;
  floor?: string | null;
  beds_raw?: string | null;
  operational_state?: string | null;
};

export type MarinaAvailabilityResult = {
  room_type_id: string;
  room_type_code: string;
  room_type_name: string;
  capacity_adults: number;
  capacity_children?: number | null;
  area?: string | null;
  available_count: number;
  available_rooms: MarinaAvailabilityRoom[];
  pricing?: {
    sellable?: boolean;
    total_kgs?: number | null;
    reason?: string | null;
  };
};

type MarinaAvailabilityResponse = {
  property: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  results: MarinaAvailabilityResult[];
};

type MarinaReservationRequestInput = {
  guest_name: string;
  phone: string;
  email?: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  room_type_code?: string | null;
  source: string;
  notes?: string | null;
};

type MarinaReservationRequestResponse = {
  id: string;
  status: string;
  is_reservation: boolean;
  message?: string;
};

export function isMarinaBookingSource(): boolean {
  return process.env.BOOKING_SOURCE?.trim().toLowerCase() === "marina";
}

function marinaBaseUrl(): string {
  const raw = process.env.MARINA_CORE_BASE_URL?.trim();
  if (!raw) {
    throw new Error("MARINA_CORE_BASE_URL is required when BOOKING_SOURCE=marina");
  }
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("MARINA_CORE_BASE_URL must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("MARINA_CORE_BASE_URL must not contain credentials");
  }
  return url.toString().replace(/\/$/, "");
}

async function marinaFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${marinaBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

export async function fetchMarinaAvailability(input: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}): Promise<MarinaAvailabilityResponse> {
  const params = new URLSearchParams({
    check_in: input.checkIn,
    check_out: input.checkOut,
    adults: String(input.adults),
    children: String(input.children ?? 0),
  });
  const response = await marinaFetch(`/api/v1/booking/check-availability?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`MARINA availability failed with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as MarinaAvailabilityResponse;
  if (!Array.isArray(payload.results)) {
    throw new Error("MARINA availability returned an invalid payload");
  }
  return payload;
}

export async function createMarinaReservationRequest(
  input: MarinaReservationRequestInput,
): Promise<MarinaReservationRequestResponse> {
  const response = await marinaFetch("/api/v1/booking/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`MARINA reservation request failed with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as MarinaReservationRequestResponse;
  if (!payload.id || payload.is_reservation !== false) {
    throw new Error("MARINA reservation request returned an invalid payload");
  }
  return payload;
}
