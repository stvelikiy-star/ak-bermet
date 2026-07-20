import { cookies } from "next/headers";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "./manager-auth";

// Серверная проверка сессии менеджера (для route handlers).
export async function isManagerAuthenticated(): Promise<boolean> {
  if (!isManagerAuthEnabled()) return true;
  const store = await cookies();
  const value = store.get(getManagerCookieName())?.value;
  return isValidManagerSession(value);
}
