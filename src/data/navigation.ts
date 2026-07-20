// Навигация сайта. Один источник правды для Header, MobileMenu и Footer.

export type NavItem = { label: string; href: string };

export const MAIN_NAV: NavItem[] = [
  { label: "Главная", href: "/" },
  { label: "Номера", href: "/rooms" },
  { label: "Garden 2026", href: "/garden" },
  { label: "Источники", href: "/hot-springs" },
  { label: "SPA", href: "/spa" },
  { label: "Мероприятия", href: "/events" },
  { label: "Питание", href: "/food" },
  { label: "Акции", href: "/promos" },
  { label: "Контакты", href: "/contacts" },
];

// Полное меню для футера (с FAQ)
export const FOOTER_NAV: NavItem[] = [
  ...MAIN_NAV.filter((i) => i.href !== "/"),
  { label: "Частые вопросы", href: "/faq" },
];
