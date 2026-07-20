import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";
import { roomDetailSlugs } from "@/data/room-details";

// Все публичные роуты сайта
const routes = [
  "/",
  "/rooms",
  ...roomDetailSlugs.map((slug) => `/rooms/${slug}`),
  "/garden",
  "/hot-springs",
  "/spa",
  "/events",
  "/food",
  "/promos",
  "/contacts",
  "/faq",
  "/legal/public-offer",
  "/legal/privacy",
  "/legal/terms",
  "/legal/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/rooms/") ? 0.6 : 0.7,
  }));
}
