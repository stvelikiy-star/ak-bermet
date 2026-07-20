import SectionHeading from "@/components/ui/SectionHeading";
import { whyChoose } from "@/data/home";

export default function WhyChooseSection() {
  return (
    <section id="about" className="bg-beige py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Наши преимущества"
          title="Почему выбирают Ак-Бермет"
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {whyChoose.map((r) => (
            <div key={r.title} className="text-center">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-milk to-cream text-gold shadow-soft ring-1 ring-gold/20">
                <r.icon className="h-7 w-7" />
              </span>
              <h3 className="font-display text-[15px] font-semibold leading-snug text-emerald-deep">
                {r.title}
              </h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-muted">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
