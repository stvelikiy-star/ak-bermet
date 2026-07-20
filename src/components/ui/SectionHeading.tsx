export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`}>
      {eyebrow && (
        <p
          className={`mb-3 text-[11px] font-semibold uppercase tracking-wider2 ${
            light ? "text-gold-soft" : "text-gold-dark"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`eyebrow-line font-display text-3xl font-semibold sm:text-4xl ${
          light ? "text-white" : "text-emerald-deep"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base ${
            light ? "text-white/70" : "text-muted"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
