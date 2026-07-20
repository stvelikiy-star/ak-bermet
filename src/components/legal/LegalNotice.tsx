import type { ReactNode } from "react";
import { IconShield } from "@/components/ui/icons";

/**
 * Выделенный блок-уведомление для важных правил
 * (например, что заявка не равна подтверждённой брони).
 */
export default function LegalNotice({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-5 rounded-2xl border border-gold/30 bg-white p-5 shadow-soft">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep">
          <IconShield className="h-5 w-5" />
        </span>
        <div className="space-y-2 text-sm leading-relaxed text-emerald-deep/85">
          {title && (
            <p className="font-display text-base font-semibold text-emerald-deep">
              {title}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
