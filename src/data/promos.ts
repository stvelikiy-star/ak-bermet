import { WA } from "./site";

export type Promo = {
  badge: string;
  title: string;
  offer: string;
  details: string;
  note: string;
  cta: { label: string; href: string };
};

// No dated promotion is exposed as active unless it is currently confirmed.
// The June 8–30 "3+1" offer is expired and must not be presented to guests.
export const promos: Promo[] = [];

// The home page keeps a safe, non-price-bearing CTA instead of an expired offer.
export const featuredPromo: Promo = {
  badge: "Актуальные предложения",
  title: "Специальные условия для вашего заезда",
  offer: "Уточните доступные предложения у администратора",
  details: "Акции зависят от дат и категории номера.",
  note: "Окончательные условия подтверждает администратор перед бронированием.",
  cta: { label: "Уточнить предложения", href: WA.promo },
};

export const promosPlaceholder = "Новые предложения скоро появятся.";
