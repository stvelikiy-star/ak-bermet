import { miniBenefits } from "@/data/home";

export default function MiniBenefitsSection() {
  return (
    <section className="relative bg-emerald-900">
      <div className="grain absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-y divide-white/10 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {miniBenefits.map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-3 px-2 py-5 sm:px-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
                <b.icon className="h-5 w-5" />
              </span>
              <span className="text-[13px] font-medium leading-tight text-white/85">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
