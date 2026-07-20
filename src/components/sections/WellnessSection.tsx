import Photo from "@/components/ui/Photo";
import Link from "next/link";
import { springs, spa } from "@/data/wellness";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { IconCheck, IconArrowRight } from "@/components/ui/icons";

type Block = {
  title: string;
  text: string;
  points: readonly string[];
  button: { label: string; href: string };
  waButton: { label: string; href: string };
  img: string;
  alt: string;
  note?: string;
};

function Panel({ block }: { block: Block }) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-emerald-900/60 shadow-card sm:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-7">
        <h3 className="font-display text-2xl font-semibold text-white">
          {block.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {block.text}
        </p>
        <ul className="mt-5 space-y-2.5">
          {block.points.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2.5 text-sm text-white/85"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-soft">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={block.button.href}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
          >
            {block.button.label}
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={block.waButton.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-gold/60 hover:text-gold-soft"
          >
            <WhatsAppIcon size={18} className="shrink-0" />
            {block.waButton.label}
          </a>
        </div>
        {block.note && (
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            {block.note}
          </p>
        )}
      </div>
      <Photo
        src={block.img}
        alt={block.alt}
        className="min-h-[240px] w-full sm:min-h-full"
      />
    </div>
  );
}

export default function WellnessSection() {
  return (
    <section id="wellness" className="relative bg-emerald-deep py-16 sm:py-24">
      <div className="grain absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel block={springs} />
          <Panel block={spa} />
        </div>
      </div>
    </section>
  );
}
