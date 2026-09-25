import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AiChat from "@/components/AiChat";
import BrandIntro from "@/components/BrandIntro";
import ConditionalSiteChrome from "@/components/layout/ConditionalSiteChrome";
import PremiumMotion from "@/components/ui/PremiumMotion";
import { htmlLangFor } from "@/i18n/locale";
import { getLocale } from "@/i18n/locale.server";
import { SITE } from "@/data/site";
import { t } from "@/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = t("AK BERMET — отдых, SPA и горячие источники на Иссык-Куле", locale);
  const description = t(
    "Оздоровительный SPA & Wellness комплекс на Иссык-Куле: горячие минеральные источники, SPA, номера и коттеджи, трёхразовое питание и площадки для мероприятий рядом с Чолпон-Атой.",
    locale,
  );

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: title,
      template: "%s — AK BERMET SPA & WELLNESS",
    },
    description,
    applicationName: "AK BERMET",
    alternates: { canonical: "/" },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: SITE.url,
      siteName: "AK BERMET — SPA & WELLNESS",
    },
  };
}
export const viewport: Viewport = {
  themeColor: "#0A312C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={htmlLangFor(locale)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('akbermet_brand_intro_seen')==='1'){document.documentElement.classList.add('ak-intro-seen')}}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ConditionalSiteChrome
          intro={<BrandIntro locale={locale} />}
          header={<Header locale={locale} />}
          footer={<Footer />}
          aiChat={<AiChat locale={locale} />}
        >
          {children}
          <PremiumMotion />
        </ConditionalSiteChrome>
      </body>
    </html>
  );
}
