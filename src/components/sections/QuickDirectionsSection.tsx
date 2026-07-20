import Photo from "@/components/ui/Photo";
import { quickDirections } from "@/data/home";
import { IconArrowRight } from "@/components/ui/icons";

export default function QuickDirectionsSection() {
  return (
    <section
      id="directions"
      className="relative bg-gradient-to-b from-cream to-beige py-16 sm:py-20"
    >
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
          Быстрый выбор · куда поедем
        </p>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
          {quickDirections.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gold/15 bg-milk p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-card"
            >
              <div className="mb-3 flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-deep/5 text-gold-dark">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-[14px] font-semibold leading-tight text-emerald-deep">
                  {item.title}
                </span>
              </div>
              <Photo
                src={item.img}
                alt={item.alt}
                className="aspect-[4/3] w-full rounded-xl"
                imgClassName="group-hover:scale-110"
              />
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold-dark opacity-0 transition-opacity group-hover:opacity-100">
                Подробнее <IconArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
