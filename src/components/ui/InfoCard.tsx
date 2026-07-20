import type { ComponentType, ReactNode, SVGProps } from "react";

export default function InfoCard({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gold/15 bg-milk p-5 shadow-soft sm:p-6 ${className}`}
    >
      {(Icon || title) && (
        <div className="mb-3 flex items-center gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25">
              <Icon className="h-5 w-5" />
            </span>
          )}
          {title && (
            <h3 className="font-display text-lg font-semibold text-emerald-deep">
              {title}
            </h3>
          )}
        </div>
      )}
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}
