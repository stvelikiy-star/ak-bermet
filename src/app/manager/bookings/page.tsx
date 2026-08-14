import ManagerHeader from "@/components/manager/ManagerHeader";
import ManualBookingForm, { type ManualBookingRoomOption } from "@/components/manager/ManualBookingForm";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;
const BLOCKED_OPERATIONAL = new Set(["maintenance_required", "maintenance_in_progress", "blocked"]);

interface RelationName { name?: string | null }
interface RoomRow {
  id: string;
  room_number: string;
  max_capacity: number;
  extra_places: number;
  sellable_status: string;
  operational_status: string;
  buildings: RelationName | RelationName[] | null;
  room_categories: RelationName | RelationName[] | null;
}
interface CustomerRelation { full_name?: string | null; phone?: string | null }
interface BookingRoomRelation {
  status?: string | null;
  room_units?: ({ room_number?: string | null; buildings?: RelationName | RelationName[] | null } | Array<{ room_number?: string | null; buildings?: RelationName | RelationName[] | null }> | null);
}
interface BookingRow {
  id: string;
  booking_number: string;
  status: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount_kgs: number | string;
  prepayment_required_kgs: number | string;
  source: string;
  created_at: string;
  customers: CustomerRelation | CustomerRelation[] | null;
  booking_rooms: BookingRoomRelation[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function money(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount) : "—";
}

function date(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Ожидает подтверждения",
  confirmed: "Подтверждена",
  checked_in: "Заселён",
  checked_out: "Выехал",
  cancelled: "Отменена",
  no_show: "Не заехал",
};

function AccessPanel({ text }: { text: string }) {
  return <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{text}</div>;
}

export default async function ManagerBookingsPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  const supabase = allowed ? await createSupabaseServerClient() : null;

  let rooms: ManualBookingRoomOption[] = [];
  let bookings: BookingRow[] = [];
  let readError = false;

  if (supabase) {
    const [roomsResult, bookingsResult] = await Promise.all([
      supabase
        .from("room_units")
        .select("id, room_number, max_capacity, extra_places, sellable_status, operational_status, buildings ( name ), room_categories ( name )")
        .is("deleted_at", null)
        .eq("sellable_status", "active"),
      supabase
        .from("bookings")
        .select("id, booking_number, status, check_in, check_out, adults, children, total_amount_kgs, prepayment_required_kgs, source, created_at, customers ( full_name, phone ), booking_rooms ( status, room_units ( room_number, buildings ( name ) ) )")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (roomsResult.error || bookingsResult.error || !roomsResult.data || !bookingsResult.data) {
      readError = true;
    } else {
      rooms = (roomsResult.data as RoomRow[])
        .filter((room) => !BLOCKED_OPERATIONAL.has(room.operational_status))
        .map((room) => {
          const building = first(room.buildings)?.name ?? "Без корпуса";
          const category = first(room.room_categories)?.name ?? "Без категории";
          return {
            id: room.id,
            label: `${building} · № ${room.room_number} · ${category}`,
            maxCapacity: room.max_capacity,
            extraPlaces: room.extra_places,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "ru", { numeric: true }));
      bookings = bookingsResult.data as BookingRow[];
    }
  }

  return (
    <>
      <ManagerHeader title="Бронирования" />
      <main className="space-y-6 p-4 lg:p-8">
        {!allowed ? (
          <AccessPanel text="Для работы с бронированиями нужна роль Собственник, Администратор или Менеджер." />
        ) : !supabase ? (
          <AccessPanel text="Supabase Auth не настроен на этом окружении." />
        ) : readError ? (
          <AccessPanel text="Не удалось безопасно прочитать бронирования. Mock-данные не используются." />
        ) : (
          <>
            <ManualBookingForm rooms={rooms} />

            <section className="rounded-xl border border-gold/15 bg-white shadow-soft">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-gold/10 p-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-emerald-deep">Брони в CRM</h2>
                  <p className="mt-1 text-xs text-muted">Последние 100 записей. После создания номер сразу занимает даты в шахматке.</p>
                </div>
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-emerald-deep ring-1 ring-gold/15">{bookings.length} броней</span>
              </div>

              {bookings.length === 0 ? (
                <div className="p-6 text-sm text-muted">Пока броней нет. Реальные текущие брони можно внести вручную при сдаче проекта.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-xs">
                    <thead className="bg-cream/60 text-muted">
                      <tr>
                        <th className="px-4 py-3">№ брони</th>
                        <th className="px-4 py-3">Гость</th>
                        <th className="px-4 py-3">Номер</th>
                        <th className="px-4 py-3">Даты</th>
                        <th className="px-4 py-3">Гости</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Сумма</th>
                        <th className="px-4 py-3">20%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {bookings.map((booking) => {
                        const customer = first(booking.customers);
                        const activeRoom = (booking.booking_rooms ?? []).find((room) => room.status === "active") ?? booking.booking_rooms?.[0] ?? null;
                        const roomUnit = first(activeRoom?.room_units ?? null);
                        const building = first(roomUnit?.buildings ?? null)?.name ?? "—";
                        return (
                          <tr key={booking.id} className="align-top">
                            <td className="px-4 py-3 font-semibold text-emerald-deep">{booking.booking_number}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-emerald-deep">{customer?.full_name ?? "—"}</div>
                              <div className="mt-0.5 text-muted">{customer?.phone ?? "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-emerald-deep">{roomUnit?.room_number ? `${building} · № ${roomUnit.room_number}` : "—"}</td>
                            <td className="px-4 py-3 text-emerald-deep">{date(booking.check_in)} — {date(booking.check_out)}</td>
                            <td className="px-4 py-3 text-emerald-deep">{booking.adults} взр. · {booking.children} дет.</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800 ring-1 ring-amber-100">{STATUS_LABELS[booking.status] ?? booking.status}</span></td>
                            <td className="px-4 py-3 font-medium text-emerald-deep">{money(booking.total_amount_kgs)} сом</td>
                            <td className="px-4 py-3 text-emerald-deep">{money(booking.prepayment_required_kgs)} сом</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
