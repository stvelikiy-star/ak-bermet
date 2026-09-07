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
// These strings already exist in the RU/KG/EN/KZ dictionary.
export const featuredPromo: Promo = {
  badge: "Выгода",
  title: "Акции и специальные предложения",
  offer: "Уточнить актуальные акции",
  details: "Следите за обновлениями или уточняйте актуальные предложения у администратора.",
  note: "Актуальность предложения и условия подтверждает администратор. Напишите нам в WhatsApp.",
  cta: { label: "Уточнить актуальные акции", href: WA.promo },
};

export const promosPlaceholder = "Новые предложения скоро появятся.";
