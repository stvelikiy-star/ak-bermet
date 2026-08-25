import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import PageCTA from "@/components/sections/PageCTA";
import FaqAccordion from "@/components/ui/FaqAccordion";
import { allFaqs } from "@/data/faq";
import { WA } from "@/data/site";
import { t } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/locale.server";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description:
    "Ответы на частые вопросы о бронировании, проживании, источниках, Wi-Fi, парковке и трансфере в комплексе AK BERMET.",
};

export default async function FaqPage() {
  const locale = await getLocale();
  return (
    <main>
      <PageHero
        badge={t("Поддержка", locale)}
        title={t("Частые вопросы", locale)}
        subtitle={t(
          "Бронирование, проживание, источники, SPA и условия пребывания — собрали ответы в одном месте.",
          locale
        )}
        cta={{ label: t("Задать вопрос в WhatsApp", locale), href: WA.booking }}
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <FaqAccordion
            items={allFaqs.map((f) => ({ q: t(f.q, locale), a: t(f.a, locale) }))}
          />
        </Container>
      </section>

      <PageCTA
        title={t("Не нашли ответ?", locale)}
        text={t(
          "Напишите нам в WhatsApp — администратор ответит на любые вопросы по отдыху в Ак-Бермет.",
          locale
        )}
        cta={{ label: t("Написать в WhatsApp", locale), href: WA.booking }}
      />
    </main>
  );
}
