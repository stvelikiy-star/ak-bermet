import HeroSection from "@/components/sections/HeroSection";
import MiniBenefitsSection from "@/components/sections/MiniBenefitsSection";
import QuickDirectionsSection from "@/components/sections/QuickDirectionsSection";
import WhyChooseSection from "@/components/sections/WhyChooseSection";
import TerritorySection from "@/components/sections/TerritorySection";
import RoomsSection from "@/components/sections/RoomsSection";
import WellnessSection from "@/components/sections/WellnessSection";
import GardenSection from "@/components/sections/GardenSection";
import EventsSection from "@/components/sections/EventsSection";
import FoodSection from "@/components/sections/FoodSection";
import PromoSection from "@/components/sections/PromoSection";
import ReviewsSection from "@/components/sections/ReviewsSection";
import FAQSection from "@/components/sections/FAQSection";
import ContactsSection from "@/components/sections/ContactsSection";
import { getLocale } from "@/i18n/locale.server";

export default async function Home() {
  const locale = await getLocale();
  return (
    <main>
      <HeroSection />
      <MiniBenefitsSection />
      <QuickDirectionsSection />
      <WhyChooseSection />
      <TerritorySection />
      <RoomsSection />
      <WellnessSection />
      <GardenSection />
      <EventsSection />
      <FoodSection />
      <PromoSection />
      <ReviewsSection />
      <FAQSection locale={locale} />
      <ContactsSection />
    </main>
  );
}
