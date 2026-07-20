import type { ReactNode } from "react";

/**
 * Раздел юридического документа: номер + заголовок + содержимое.
 * Текст выводится с комфортной типографикой для чтения.
 */
export default function LegalSection({
  index,
  title,
  children,
}: {
  index?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-9 scroll-mt-24">
      <h2 className="mb-3 flex items-baseline gap-2 font-display text-xl font-semibold text-emerald-deep">
        {typeof index === "number" && (
          <span className="text-sm font-semibold text-gold-dark">
            {index}.
          </span>
        )}
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-emerald-deep/80">
        {children}
      </div>
    </section>
  );
}

/** Маркированный список для юридического текста. */
export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
