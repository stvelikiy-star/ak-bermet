import type { ComponentType, SVGProps } from "react";

export default function ManagerStatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-emerald-deep">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
