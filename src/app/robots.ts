import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/manager",
        "/manager/",
        "/staff",
        "/staff/",
        "/housekeeping",
        "/housekeeping/",
        "/technician",
        "/technician/",
        "/auth",
        "/auth/",
        "/guest",
        "/guest/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
