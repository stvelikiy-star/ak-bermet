import SectionHeading from "@/components/ui/SectionHeading";
import Photo from "@/components/ui/Photo";
import { getLocale } from "@/i18n/locale.server";
import { t } from "@/i18n/dictionary";

const territoryPhotos = [
  {
    src: "/images/territory/gallery-01-main-aerial.webp.png",
    alt: "AK BERMET — территория с высоты",
  },
  {
    src: "/images/territory/gallery-02-lake-view.webp.png",
    alt: "AK BERMET — вид на Иссык-Куль",
  },
  {
    src: "/images/territory/gallery-03-beach-pier.webp.png",
    alt: "AK BERMET — берег и пирс",
  },
  {
    src: "/images/territory/gallery-05-main-walkway.webp.png",
    alt: "AK BERMET — прогулочная территория",
  },
  {
    src: "/images/territory/gallery-06-main-building.webp.png",
    alt: "AK BERMET — территория комплекса",
  },
  {
    src: "/images/territory/gallery-09-park-alley.webp.png",
    alt: "AK BERMET — зелёная аллея",
  },
];

export default async function TerritorySection() {
  const locale = await getLocale();

  return (
    <section id="territory" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("Иссык-Куль", locale)}
          title={t("Территория AK BERMET", locale)}
          subtitle={t("Озеро, зелёные прогулочные зоны и пространство курортного комплекса.", locale)}
          className="mb-10"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Photo
            src={territoryPhotos[0].src}
            alt={t(territoryPhotos[0].alt, locale)}
            className="min-h-[320px] overflow-hidden rounded-2xl lg:col-span-7 lg:min-h-[560px]"
            imgClassName="transition-transform duration-700 hover:scale-105"
          />

          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            {territoryPhotos.slice(1, 5).map((photo) => (
              <Photo
                key={photo.src}
                src={photo.src}
                alt={t(photo.alt, locale)}
                className="min-h-[180px] overflow-hidden rounded-2xl sm:min-h-[230px]"
                imgClassName="transition-transform duration-500 hover:scale-105"
              />
            ))}
          </div>
        </div>

        <Photo
          src={territoryPhotos[5].src}
          alt={t(territoryPhotos[5].alt, locale)}
          className="mt-4 min-h-[260px] overflow-hidden rounded-2xl sm:min-h-[360px]"
          imgClassName="transition-transform duration-700 hover:scale-105"
        />
      </div>
    </section>
  );
}
