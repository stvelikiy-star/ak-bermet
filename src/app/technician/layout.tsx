import type { Metadata } from "next";
import { requireStaffRole } from "@/lib/auth/require-role";

// Middleware (src/middleware.ts) уже отсекает неавторизованных на этом
// пути; этот вызов — вторая, независимая проверка роли на уровне
// Server Component (defense in depth), как для /housekeeping.
export const metadata: Metadata = {
  title: "Кабинет техника",
  robots: { index: false, follow: false },
};
// См. пояснение в src/app/housekeeping/layout.tsx — тот же риск
// статического закэшированного редиректа без force-dynamic.
export const dynamic = "force-dynamic";

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffRole(["technician"]);
  return <div className="min-h-screen bg-beige">{children}</div>;
}
