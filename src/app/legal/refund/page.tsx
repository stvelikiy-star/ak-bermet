import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection, { LegalList } from "@/components/legal/LegalSection";
import LegalNotice from "@/components/legal/LegalNotice";
import { LEGAL } from "@/data/legal";
import { IconClock } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { getLocale } from "@/i18n/locale.server";
import type { Locale } from "@/i18n/locale";
import { t } from "@/i18n/dictionary";

type RefundTierCopy = {
  term: string;
  result: string;
  note: string;
};

type RefundCopy = {
  title: string;
  intro: string;
  summaryTitle: string;
  summary: string;
  tiersTitle: string;
  tiers: RefundTierCopy[];
  feesTitle: string;
  fees: string;
  requestTitle: string;
  requestIntro: string;
  requestItems: string[];
  writeAdmin: string;
  processingTitle: string;
  processing: string;
  disputesTitle: string;
  disputes: string;
  contactsTitle: string;
  phoneLabel: string;
  addressLabel: string;
};

const COPY: Record<Locale, RefundCopy> = {
  ru: {
    title: "Возврат и отмена бронирования",
    intro:
      "Условия отмены бронирования и возврата предоплаты. Возможность возврата зависит от того, за сколько дней до заезда отменяется бронь.",
    summaryTitle: "Кратко",
    summary:
      "При отмене за 7 и более дней до заезда возврат предоплаты возможен с учётом применимой комиссии и процедуры через администратора. При отмене менее чем за 7 дней и при неявке предоплата не возвращается.",
    tiersTitle: "Условия по срокам отмены",
    tiers: [
      {
        term: "За 7 и более дней до заезда",
        result: "Возврат предоплаты возможен",
        note: "с учётом применимой комиссии и процедуры через администратора",
      },
      {
        term: "Менее чем за 7 дней до заезда",
        result: "Предоплата не возвращается",
        note: "отмена считается невозвратной",
      },
      {
        term: "Неявка (no-show)",
        result: "Предоплата не возвращается",
        note: "неявка считается невозвратной",
      },
    ],
    feesTitle: "Комиссии банка и платёжных систем",
    fees:
      "При возврате может учитываться применимая комиссия банка или платёжной системы, через которую производилась оплата. Возврат производится способом и по процедуре, согласованным с администрацией.",
    requestTitle: "Как запросить возврат",
    requestIntro:
      "Свяжитесь с администрацией по телефону или в WhatsApp и сообщите об отмене. Для обработки запроса понадобятся:",
    requestItems: [
      "ФИО гостя",
      "Номер телефона",
      "Даты бронирования",
      "Подтверждение оплаты",
      "Причина отмены",
    ],
    writeAdmin: "Написать администратору",
    processingTitle: "Сроки обработки",
    processing:
      "Запрос на возврат рассматривается администрацией в разумные сроки. Фактический срок зачисления зависит от правил банка или платёжной системы.",
    disputesTitle: "Спорные ситуации",
    disputes:
      "В спорных или нестандартных случаях решение принимается администрацией комплекса в соответствии с условиями бронирования и действующим законодательством Кыргызской Республики.",
    contactsTitle: "Контакты",
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Адрес",
  },
  kg: {
    title: "Бронду жокко чыгаруу жана акчаны кайтаруу",
    intro:
      "Бронду жокко чыгаруу жана алдын ала төлөмдү кайтаруу шарттары. Кайтаруу мүмкүнчүлүгү брон келүүгө канча күн калганда жокко чыгарылганына жараша болот.",
    summaryTitle: "Кыскача",
    summary:
      "Келүүгө 7 же андан көп күн калганда жокко чыгарылса, алдын ала төлөм колдонулуучу комиссияны жана администратор аркылуу жүргүзүлүүчү тартипти эске алуу менен кайтарылышы мүмкүн. Келүүгө 7 күндөн аз калганда жана келбей калганда алдын ала төлөм кайтарылбайт.",
    tiersTitle: "Жокко чыгаруу мөөнөттөрү боюнча шарттар",
    tiers: [
      {
        term: "Келүүгө 7 же андан көп күн калганда",
        result: "Алдын ала төлөмдү кайтаруу мүмкүн",
        note: "колдонулуучу комиссияны жана администратор аркылуу жүргүзүлүүчү тартипти эске алуу менен",
      },
      {
        term: "Келүүгө 7 күндөн аз калганда",
        result: "Алдын ала төлөм кайтарылбайт",
        note: "жокко чыгаруу кайтарылгыс болуп эсептелет",
      },
      {
        term: "Келбей калуу (no-show)",
        result: "Алдын ала төлөм кайтарылбайт",
        note: "келбей калуу кайтарылгыс болуп эсептелет",
      },
    ],
    feesTitle: "Банк жана төлөм системаларынын комиссиялары",
    fees:
      "Кайтарууда төлөм жүргүзүлгөн банктын же төлөм системасынын колдонулуучу комиссиясы эске алынышы мүмкүн. Кайтаруу администратор менен макулдашылган ыкма жана тартип боюнча жүргүзүлөт.",
    requestTitle: "Кайтарууну кантип сураса болот",
    requestIntro:
      "Администрация менен телефон же WhatsApp аркылуу байланышып, жокко чыгаруу жөнүндө кабарлаңыз. Өтүнмөнү иштетүү үчүн төмөнкүлөр керек:",
    requestItems: [
      "Коноктун аты-жөнү",
      "Телефон номери",
      "Брондоо даталары",
      "Төлөмдү ырастоо",
      "Жокко чыгаруунун себеби",
    ],
    writeAdmin: "Администраторго жазуу",
    processingTitle: "Иштетүү мөөнөттөрү",
    processing:
      "Кайтаруу жөнүндө өтүнмө администрация тарабынан акылга сыярлык мөөнөттө каралат. Акчанын эсепке түшүү мөөнөтү банктын же төлөм системасынын эрежелерине жараша болот.",
    disputesTitle: "Талаштуу жагдайлар",
    disputes:
      "Талаштуу же стандарттуу эмес учурларда чечим брондоо шарттарына жана Кыргыз Республикасынын колдонуудагы мыйзамдарына ылайык комплекстин администрациясы тарабынан кабыл алынат.",
    contactsTitle: "Байланыштар",
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Дарек",
  },
  en: {
    title: "Booking cancellation and refunds",
    intro:
      "Terms for cancelling a booking and refunding the prepayment. Refund eligibility depends on how many days before arrival the booking is cancelled.",
    summaryTitle: "Summary",
    summary:
      "If a booking is cancelled 7 or more days before arrival, a prepayment refund may be possible subject to the applicable fee and the administrator’s refund procedure. If cancelled less than 7 days before arrival or in case of a no-show, the prepayment is non-refundable.",
    tiersTitle: "Cancellation timing",
    tiers: [
      {
        term: "7 or more days before arrival",
        result: "Prepayment refund may be possible",
        note: "subject to the applicable fee and the procedure handled through the administrator",
      },
      {
        term: "Less than 7 days before arrival",
        result: "Prepayment is non-refundable",
        note: "the cancellation is treated as non-refundable",
      },
      {
        term: "No-show",
        result: "Prepayment is non-refundable",
        note: "a no-show is treated as non-refundable",
      },
    ],
    feesTitle: "Bank and payment-system fees",
    fees:
      "A refund may be subject to the applicable fee charged by the bank or payment system used for payment. The refund method and procedure are agreed with the administration.",
    requestTitle: "How to request a refund",
    requestIntro:
      "Contact the administration by phone or WhatsApp and report the cancellation. The following information is required to process the request:",
    requestItems: [
      "Guest’s full name",
      "Phone number",
      "Booking dates",
      "Proof of payment",
      "Reason for cancellation",
    ],
    writeAdmin: "Message the administrator",
    processingTitle: "Processing time",
    processing:
      "Refund requests are reviewed by the administration within a reasonable period. The actual crediting time depends on the rules of the bank or payment system.",
    disputesTitle: "Disputed situations",
    disputes:
      "In disputed or non-standard situations, the resort administration makes a decision in accordance with the booking terms and the applicable laws of the Kyrgyz Republic.",
    contactsTitle: "Contacts",
    phoneLabel: "Phone / WhatsApp",
    addressLabel: "Address",
  },
  kz: {
    title: "Брондауды жою және ақшаны қайтару",
    intro:
      "Брондауды жою және алдын ала төлемді қайтару шарттары. Қайтару мүмкіндігі бронь келуге қанша күн қалғанда жойылғанына байланысты.",
    summaryTitle: "Қысқаша",
    summary:
      "Келуге 7 немесе одан көп күн қалғанда броньнан бас тартылса, алдын ала төлем қолданылатын комиссияны және әкімші арқылы рәсімдеу тәртібін ескере отырып қайтарылуы мүмкін. Келуге 7 күннен аз қалғанда немесе қонақ келмеген жағдайда алдын ала төлем қайтарылмайды.",
    tiersTitle: "Жою мерзімдері бойынша шарттар",
    tiers: [
      {
        term: "Келуге 7 немесе одан көп күн қалғанда",
        result: "Алдын ала төлемді қайтару мүмкін",
        note: "қолданылатын комиссияны және әкімші арқылы рәсімдеу тәртібін ескере отырып",
      },
      {
        term: "Келуге 7 күннен аз қалғанда",
        result: "Алдын ала төлем қайтарылмайды",
        note: "броньнан бас тарту қайтарылмайтын болып есептеледі",
      },
      {
        term: "Қонақтың келмеуі (no-show)",
        result: "Алдын ала төлем қайтарылмайды",
        note: "келмеу қайтарылмайтын жағдай болып есептеледі",
      },
    ],
    feesTitle: "Банк және төлем жүйелерінің комиссиялары",
    fees:
      "Қайтару кезінде төлем жасалған банктің немесе төлем жүйесінің қолданылатын комиссиясы ескерілуі мүмкін. Қайтару әкімшілікпен келісілген тәсіл және рәсім бойынша жүргізіледі.",
    requestTitle: "Қайтаруды қалай сұратуға болады",
    requestIntro:
      "Әкімшілікке телефон немесе WhatsApp арқылы хабарласып, броньнан бас тарту туралы айтыңыз. Өтінімді өңдеу үшін мыналар қажет:",
    requestItems: [
      "Қонақтың аты-жөні",
      "Телефон нөмірі",
      "Брондау күндері",
      "Төлемді растау",
      "Бас тарту себебі",
    ],
    writeAdmin: "Әкімшіге жазу",
    processingTitle: "Өңдеу мерзімдері",
    processing:
      "Қайтару туралы өтінім әкімшілік тарапынан ақылға қонымды мерзімде қаралады. Ақшаның нақты түсу мерзімі банк немесе төлем жүйесінің ережелеріне байланысты.",
    disputesTitle: "Даулы жағдайлар",
    disputes:
      "Даулы немесе стандарттан тыс жағдайларда шешімді кешен әкімшілігі брондау шарттарына және Қырғыз Республикасының қолданыстағы заңнамасына сәйкес қабылдайды.",
    contactsTitle: "Байланыстар",
    phoneLabel: "Телефон / WhatsApp",
    addressLabel: "Мекенжай",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = COPY[locale];
  return {
    title: copy.title,
    description: copy.intro,
    alternates: { canonical: "/legal/refund" },
  };
}

export default async function RefundPage() {
  const locale = await getLocale();
  const copy = COPY[locale];

  return (
    <LegalPageLayout title={copy.title} intro={copy.intro} locale={locale}>
      <LegalSection title={copy.summaryTitle}>
        <p>{copy.summary}</p>
      </LegalSection>

      <LegalSection title={copy.tiersTitle}>
        <div className="grid gap-4 sm:grid-cols-3">
          {copy.tiers.map((tier) => (
            <div
              key={tier.term}
              className="rounded-2xl border border-gold/20 bg-white p-5 shadow-soft"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-gold-dark">
                <IconClock className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold-dark">
                {tier.term}
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-emerald-deep">
                {tier.result}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{tier.note}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title={copy.feesTitle}>
        <p>{copy.fees}</p>
      </LegalSection>

      <LegalSection title={copy.requestTitle}>
        <p>{copy.requestIntro}</p>
        <LegalList items={copy.requestItems} />
        <a
          href={LEGAL.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon size={16} className="shrink-0" />
          {copy.writeAdmin}
        </a>
      </LegalSection>

      <LegalSection title={copy.processingTitle}>
        <p>{copy.processing}</p>
      </LegalSection>

      <LegalSection title={copy.disputesTitle}>
        <LegalNotice>
          <p>{copy.disputes}</p>
        </LegalNotice>
      </LegalSection>

      <LegalSection title={copy.contactsTitle}>
        <LegalList
          items={[
            `${copy.phoneLabel}: ${LEGAL.phoneDisplay}`,
            `Email: ${LEGAL.email}`,
            `${copy.addressLabel}: ${t(LEGAL.address, locale)}`,
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
