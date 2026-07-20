// Простая MVP-авторизация менеджера через PIN из env.
// ВАЖНО: подходит только для демо/MVP. Для production нужна нормальная
// авторизация с ролями. PIN в cookie НЕ хранится — хранится производное
// значение сессии.

// Лёгкий детерминированный хэш (FNV-1a), работает и в Node, и в Edge (middleware).
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function isManagerAuthEnabled(): boolean {
  return process.env.MANAGER_AUTH_ENABLED === "true";
}

export function getManagerCookieName(): string {
  return process.env.MANAGER_SESSION_COOKIE || "akbermet_manager_session";
}

export function getManagerSessionHours(): number {
  const n = Number(process.env.MANAGER_SESSION_HOURS || "12");
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function getPin(): string {
  return process.env.MANAGER_ACCESS_PIN || "";
}

export function verifyManagerPin(pin: string): boolean {
  const real = getPin();
  return real.length > 0 && pin === real;
}

// Значение сессии — производное от PIN, но не сам PIN.
export function createManagerSessionValue(): string {
  return `v1.${fnv1a(`${getPin()}:${getManagerCookieName()}`)}`;
}

export function isValidManagerSession(value?: string): boolean {
  if (!value) return false;
  return value === createManagerSessionValue();
}
