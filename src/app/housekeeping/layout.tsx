import type { Metadata } from "next";
import { requireStaffRole } from "@/lib/auth/require-role";

// Middleware (src/middleware.ts) уже отсекает неавторизованных на этом
// пути; этот вызов — вторая, независимая проверка роли на уровне
// Server Component (defense in depth), как для /technician.
export const metadata: Metadata = {
  title: "Кабинет горничной",
  robots: { index: false, follow: false },
};
// Обязательно: без этого при отсутствии переменных окружения Supabase
// эта проверка ролей выполнится один раз на этапе сборки (cookies()
// не вызывается, если клиент не сконфигурирован) и результат
// («редирект на /staff/login») будет статически закэширован для всех
// посетителей, а не пересчитан для каждого запроса.
export const dynamic = "force-dynamic";

export default async function HousekeepingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffRole(["housekeeping"]);
  return <div className="min-h-screen bg-beige">{children}</div>;
}
