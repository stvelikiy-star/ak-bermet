import { notFound } from "next/navigation";
import GuestRequestForm from "@/components/guest/GuestRequestForm";
import { findGuestRoomByToken } from "@/lib/guest-qr";
export const dynamic = "force-dynamic";
export default async function GuestRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await findGuestRoomByToken(token);
  if (!guest) notFound();
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-deep to-emerald-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="rounded-2xl border border-gold/30 bg-white/10 p-6 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">AK BERMET</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Гостевой сервис</h1>
          <p className="mt-2 text-base font-medium text-white/90">{guest.guestName}</p>
          <p className="mt-1 text-sm text-white/75">{guest.buildingName} · номер {guest.roomNumber}</p>
          <p className="mt-1 text-xs text-white/55">Бронь {guest.bookingNumber} · {guest.categoryName} · QR действует до {new Date(guest.expiresAt).toLocaleDateString("ru-RU")}</p>
        </header>
        <section className="rounded-2xl border border-gold/20 bg-milk p-5 text-ink shadow-float">
          <h2 className="font-display text-xl font-semibold text-emerald-deep">Что нужно в номер?</h2>
          <p className="mt-1 text-sm text-muted">Выберите услугу и при необходимости оставьте комментарий.</p>
          <GuestRequestForm token={token} />
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/75"><p>Для срочных вопросов позвоните на стойку размещения. Заявка передана персоналу AK BERMET.</p></section>
      </div>
    </main>
  );
}
