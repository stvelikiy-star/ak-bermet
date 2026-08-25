import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";

// Только для серверных компонентов. Клиентские компоненты (Header, LanguageSwitcher,
// AiChat) получают locale пропом сверху и не должны импортировать этот файл.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}
