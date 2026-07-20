import Container from "@/components/ui/Container";
import { IconArrowRight } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export default function PageCTA({
  title,
  text,
  cta,
}: {
  title: string;
  text: string;
  cta: { label: string; href: string };
}) {
  const isWa = cta.href.startsWith("http");
  return (
    <section className="bg-cream py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-emerald-deep to-emerald-900 px-6 py-12 text-center shadow-card sm:px-10">
          <div className="grain absolute inset-0 opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75">
              {text}
            </p>
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
          </div>
        </div>
      </Container>
    </section>
  );
}
