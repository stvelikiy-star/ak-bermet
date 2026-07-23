import type { Metadata } from "next";
import Link from "next/link";
import { IconShield } from "@/components/ui/icons";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { ROLE_LABELS } from "@/types/auth";

export const metadata: Metadata = {
  title: "Доступ запрещён",
  robots: { index: false, follow: false },
};
// Без переменных окружения Supabase cookies() внутри getCurrentStaff()
// никогда не вызывается, и страница иначе была бы статически
// закэширована с одним и тем же результатом для всех — см. подробное
// пояснение в src/app/housekeeping/layout.tsx.
export const dynamic = "force-dynamic";

export default async function StaffUnauthorizedPage() {
  const staff = await getCurrentStaff();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-deep to-emerald-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-milk p-8 text-center shadow-float">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <IconShield className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-emerald-deep">
          Доступ запрещён
        </h1>
        <p className="mt-2 text-sm text-muted">
          У вашей учётной записи нет роли, необходимой для этого раздела.
        </p>

        {staff && (
          <p className="mt-3 text-xs text-muted">
            Ваши роли:{" "}
            {staff.roles.length > 0
              ? staff.roles.map((r) => ROLE_LABELS[r]).join(", ")
              : "не назначены"}
            . Обратитесь к владельцу или администратору, чтобы изменить доступ.
          </p>
        )}

        <Link
          href="/staff/login"
          className="mt-6 inline-block w-full rounded-full bg-emerald-deep px-6 py-3 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
        >
          Войти под другой учётной записью
        </Link>
      </div>
    </div>
  );
}
