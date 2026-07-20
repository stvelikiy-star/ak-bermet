import type { ComponentType, SVGProps } from "react";
import { IconCheck } from "@/components/ui/icons";

export type Feature = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  text?: string;
};

export default function FeatureGrid({
  features,
  columns = 3,
}: {
  features: Feature[];
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 gap-4 ${cols}`}>
      {features.map((f) => {
        const Icon = f.icon ?? IconCheck;
        return (
          <div
            key={f.label}
            className="flex items-start gap-3 rounded-2xl border border-gold/15 bg-milk p-4 shadow-soft sm:p-5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-deep">
                {f.label}
              </p>
              {f.text && (
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {f.text}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
