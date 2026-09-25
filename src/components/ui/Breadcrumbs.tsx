import Link from "next/link";
import { t } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locale";

export default function Breadcrumbs({
  items,
  locale = "ru",
}: {
  items: { label: string; href?: string }[];
  locale?: Locale;
}) {
  return (
    <nav aria-label={t("Хлебные крошки", locale)} className="text-xs text-white/60">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold-soft"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "text-gold-soft" : ""}>
                  {item.label}
                </span>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
