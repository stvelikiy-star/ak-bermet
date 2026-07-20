import type { ComponentType, SVGProps } from "react";

export type PriceRow = { label: string; price: string };

export default function PriceCard({
  title,
  rows,
  note,
  icon: Icon,
  highlight = false,
}: {
  title: string;
  rows: PriceRow[];
  note?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card ${
        highlight
          ? "border-gold/40 bg-gradient-to-br from-emerald-deep to-emerald-900"
          : "border-gold/15 bg-milk"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              highlight
                ? "bg-white/10 text-gold-soft"
                : "bg-emerald-deep/5 text-gold-dark ring-1 ring-gold/25"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <h3
          className={`font-display text-lg font-semibold ${
            highlight ? "text-white" : "text-emerald-deep"
          }`}
        >
          {title}
        </h3>
      </div>

      <ul
        className={`flex-1 divide-y ${
          highlight ? "divide-white/10" : "divide-gold/10"
        }`}
      >
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-4 py-2.5 text-sm"
          >
            <span className={highlight ? "text-white/75" : "text-muted"}>
              {r.label}
            </span>
            <span
              className={`shrink-0 font-semibold ${
                highlight ? "text-gold-soft" : "text-emerald-deep"
              }`}
            >
              {r.price}
            </span>
          </li>
        ))}
      </ul>

      {note && (
        <p
          className={`mt-4 text-xs leading-relaxed ${
            highlight ? "text-white/50" : "text-muted"
          }`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
