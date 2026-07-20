import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AiChat from "@/components/AiChat";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "AK BERMET — отдых, SPA и горячие источники на Иссык-Куле",
    template: "%s — AK BERMET SPA & WELLNESS",
  },
  description:
    "Оздоровительный SPA & Wellness комплекс на Иссык-Куле: горячие минеральные источники, SPA, номера и коттеджи, трёхразовое питание и площадки для мероприятий рядом с Чолпон-Атой.",
  keywords: [
    "Ак-Бермет",
    "Иссык-Куль",
    "SPA",
    "горячие источники",
    "термальные источники",
    "курорт Кыргызстан",
    "отдых на Иссык-Куле",
  ],
  applicationName: "AK BERMET",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "AK BERMET — SPA & Wellness на Иссык-Куле",
    description:
      "Премиальный курорт с термальными источниками и SPA-комплексом на берегу Иссык-Куля.",
    type: "website",
    locale: "ru_RU",
    url: SITE.url,
    siteName: "AK BERMET — SPA & WELLNESS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A312C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <AiChat />
      </body>
    </html>
  );
}
