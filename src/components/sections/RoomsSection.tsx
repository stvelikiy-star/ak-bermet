import Photo from "@/components/ui/Photo";
import Link from "next/link";
import { rooms, roomsNote } from "@/data/rooms";
import { WA } from "@/data/site";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { IconArrowRight } from "@/components/ui/icons";

export default function RoomsSection() {
  return (
    <section id="rooms" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center justify-between gap-5 sm:mb-14 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider2 text-gold-dark">
              Размещение
            </p>
            <h2 className="font-display text-3xl font-semibold text-emerald-deep sm:text-4xl">
              Номера и коттеджи
            </h2>
          </div>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-milk px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            Смотреть номера <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gold/15 bg-milk shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
            >
              <div className="relative">
                <Photo
                  src={room.img}
                  alt={room.alt}
                  className="aspect-[4/3] w-full"
                  imgClassName="group-hover:scale-105"
                />
                {room.badge && (
                  <span className="absolute left-3 top-3 rounded-full bg-gradient-to-b from-gold-soft to-gold px-3 py-1 text-[11px] font-semibold text-emerald-deep shadow-gold">
                    {room.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-xl font-semibold text-emerald-deep">
                  {room.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {room.text}
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link
                    href="/rooms"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-deep px-5 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-emerald-800"
                  >
                    Подробнее <IconArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={WA.availability}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-cream px-5 py-2.5 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
                  >
                    <WhatsAppIcon size={18} className="shrink-0" />
                    Узнать наличие
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Осторожная формулировка о наличии */}
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted">
          {roomsNote}
        </p>
      </div>
    </section>
  );
}
