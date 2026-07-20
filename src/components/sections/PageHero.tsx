import Container from "@/components/ui/Container";
import { IconArrowRight } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export default function PageHero({
  badge,
  title,
  subtitle,
  image,
  cta,
}: {
  badge: string;
  title: string;
  subtitle: string;
  image?: string;
  cta?: { label: string; href: string };
}) {
  const isWa = cta?.href.startsWith("http");
  return (
    <section className="relative overflow-hidden bg-emerald-deep">
      {/* Фон */}
      <div className="absolute inset-0" aria-hidden>
        {image && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url('${image}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-deep via-emerald-deep/85 to-emerald-deep/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep via-transparent to-emerald-deep/30" />
        <div className="grain absolute inset-0 opacity-40" />
      </div>

      <Container className="relative pb-14 pt-32 sm:pb-20 sm:pt-40">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-emerald-deep/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider2 text-gold-soft backdrop-blur">
            {badge}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.12] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {subtitle}
          </p>
          {cta && (
            <a
              href={cta.href}
              target={isWa ? "_blank" : undefined}
              rel={isWa ? "noopener noreferrer" : undefined}
              className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-gold-soft to-gold px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-emerald-deep shadow-gold transition-transform hover:-translate-y-0.5"
            >
              {isWa ? (
                <WhatsAppIcon size={20} className="shrink-0" />
              ) : (
                <IconArrowRight className="h-5 w-5" />
              )}
              {cta.label}
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}
