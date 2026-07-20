import { WA } from "./site";

export type Promo = {
  badge: string;
  title: string;
  offer: string;
  details: string;
  note: string;
  cta: { label: string; href: string };
};

export const promos: Promo[] = [
  {
    badge: "Сезонное предложение",
    title: "Проведите июнь с комфортом",
    offer: "3+1: бронируйте 3 ночи — 4-я ночь бесплатно",
    details: "Действует с 8 по 30 июня на номера категории люкс корпуса 2 и 3.",
    note: "Акции действуют в определённые периоды. Актуальность предложения уточняйте у администратора.",
    cta: { label: "Уточнить акцию", href: WA.promo31 },
  },
];

// Первая (активная) акция — используется в секции на главной
export const featuredPromo = promos[0];

export const promosPlaceholder = "Новые предложения скоро появятся.";
