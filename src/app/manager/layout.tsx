import type { Metadata } from "next";
import ManagerSidebar from "@/components/manager/ManagerSidebar";

// Роль-защита (Supabase Auth: owner/administrator/manager, либо легаси
// PIN) выполняется в middleware.ts, а не здесь — это единственное
// место, которое надёжно исключает вложенный /manager/login из
// проверки без риска зациклить редирект. См. src/middleware.ts.

export const metadata: Metadata = {
  title: "Кабинет менеджера",
  robots: { index: false, follow: false },
};

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-beige">
      <div className="flex">
        {/* Десктоп-сайдбар */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-emerald-deep lg:block">
          <ManagerSidebar />
        </aside>

        <div className="flex min-h-screen w-full flex-col">{children}</div>
      </div>
    </div>
  );
}
