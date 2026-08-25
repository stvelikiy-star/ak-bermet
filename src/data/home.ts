// Номерные карточки используют только подтверждённый локальный placeholder до загрузки реальных фото AK BERMET.
// Для остальных направлений временные иллюстрации будут заменяться отдельно.
import {
  IconSpring,
  IconSun,
  IconWaves,
  IconHeart,
  IconBed,
  IconLotus,
  IconLeaf,
  IconDish,
  IconCamera,
  IconShield,
  IconDrop,
  IconGift,
  IconCalendar,
  IconUsers,
} from "@/components/ui/icons";

export const heroFacts = [
  { icon: IconSpring, label: "Собственные термальные источники" },
  { icon: IconSun, label: "Чистый воздух и горный климат" },
  { icon: IconWaves, label: "Пляж и виды на озеро" },
  { icon: IconHeart, label: "Комфорт и сервис высокого уровня" },
];

export const miniBenefits = [
  { icon: IconSpring, label: "Собственные термальные источники" },
  { icon: IconDish, label: "3-разовое питание" },
  { icon: IconSun, label: "Круглогодичный отдых" },
  { icon: IconUsers, label: "Конференц-залы до 250 человек" },
];

export const quickDirections = [
  {
    icon: IconBed,
    title: "Номера и коттеджи",
    href: "/rooms",
    img: "/images/hero/rooms-hero.png",
    alt: "Номера и коттеджи AK BERMET",
  },
  {
    icon: IconSpring,
    title: "Горячие источники",
    href: "/hot-springs",
    img: "/images/hot-springs/hot-springs-main.png",
    alt: "Горячие термальные источники",
  },
  {
    icon: IconLotus,
    title: "SPA-комплекс",
    href: "/spa",
    img: "/images/hero/spa-hero.png",
    alt: "SPA-комплекс",
  },
  {
    icon: IconLeaf,
    title: "Garden Rooms 2026",
    href: "/garden",
    img: "/images/garden/garden-01.png",
    alt: "Garden Rooms AK BERMET",
  },
  {
    icon: IconUsers,
    title: "Корпоративы и мероприятия",
    href: "/events",
    img: "/images/events/events-corporate-card.png",
    alt: "Корпоративы и мероприятия",
  },
  {
    icon: IconDish,
    title: "Питание и рестораны",
    href: "/food",
    img: "/images/hero/food-hero.png",
    alt: "Питание и рестораны",
  },
];

export const whyChoose = [
  {
    icon: IconDrop,
    title: "Горячие источники круглый год",
    text: "Собственный термальный комплекс с минеральной водой.",
  },
  {
    icon: IconDish,
    title: "Трёхразовое питание",
    text: "Завтрак, обед и ужин входят в проживание.",
  },
  {
    icon: IconLeaf,
    title: "Garden Rooms",
    text: "32 подтверждённых двухместных номера в Garden 1 и Garden 2.",
  },
  {
    icon: IconLotus,
    title: "SPA & Wellness",
    text: "Бассейн, тренажёрный зал, источники и восстановление.",
  },
  {
    icon: IconUsers,
    title: "Корпоративы и конференции",
    text: "Залы до 250 человек, питание, проживание и кофе-брейки.",
  },
  {
    icon: IconHeart,
    title: "Удобно для семей",
    text: "Номера, коттеджи и услуги для отдыха с детьми.",
  },
];

export const reviews = [
  {
    text: "Гости отмечают горячие источники и возможность отдыха в любую погоду.",
    tag: "Отдых круглый год",
  },
  {
    text: "Корпоративные клиенты выбирают комплекс за залы, питание и проживание.",
    tag: "Мероприятия",
  },
  {
    text: "Семьи ценят питание, территорию и удобное расположение рядом с Чолпон-Атой.",
    tag: "Семейный отдых",
  },
];
