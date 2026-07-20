import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import FaqAccordion from "@/components/ui/FaqAccordion";
import { allFaqs } from "@/data/faq";
import { WA } from "@/data/site";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description:
    "Ответы на частые вопросы о бронировании, проживании, источниках, Wi-Fi, парковке и трансфере в комплексе AK BERMET.",
};

export default function FaqPage() {
  return (
    <main>
      <PageHero
        badge="Поддержка"
        title="Частые вопросы"
        subtitle="Бронирование, проживание, источники, SPA и условия пребывания — собрали ответы в одном месте."
        cta={{ label: "Задать вопрос в WhatsApp", href: WA.booking }}
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <FaqAccordion items={allFaqs} />
        </Container>
      </section>

      <PageCTA
        title="Не нашли ответ?"
        text="Напишите нам в WhatsApp — администратор ответит на любые вопросы по отдыху в Ак-Бермет."
        cta={{ label: "Написать в WhatsApp", href: WA.booking }}
      />
    </main>
  );
}
