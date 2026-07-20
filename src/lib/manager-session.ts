import { cookies } from "next/headers";
import {
  isManagerAuthEnabled,
  getManagerCookieName,
  isValidManagerSession,
} from "./manager-auth";

// Серверная проверка сессии менеджера (для route handlers).
export function isManagerAuthenticated(): boolean {
  if (!isManagerAuthEnabled()) return true;
  const value = cookies().get(getManagerCookieName())?.value;
  return isValidManagerSession(value);
}
