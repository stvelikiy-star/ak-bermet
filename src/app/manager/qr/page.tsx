import ManagerHeader from "@/components/manager/ManagerHeader";
import ManagerQrPanel from "@/components/manager/ManagerQrPanel";
import { getCurrentStaff, hasAnyRole } from "@/lib/auth/current-staff";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
export const dynamic = "force-dynamic";
const MANAGER_ROLES = ["owner", "administrator", "manager"] as const;

type NamedRelation = { name?: string };
type CustomerRelation = { full_name?: string };
type RoomRelation = { room_number?: string; buildings?: NamedRelation | NamedRelation[] | null };
interface BookingRoomRow { room_unit_id: string; room_units?: RoomRelation | RoomRelation[] | null; }
interface BookingRow {
  id: string;
  booking_number: string;
  status: string;
  check_in: string;
  check_out: string;
  customers?: CustomerRelation | CustomerRelation[] | null;
  booking_rooms?: BookingRoomRow[] | null;
}
function relationFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
export default async function ManagerQrPage() {
  const staff = await getCurrentStaff();
  const allowed = hasAnyRole(staff, [...MANAGER_ROLES]);
  if (!allowed) return (<><ManagerHeader title="QR гостей" /><main className="p-4 lg:p-8"><p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Для управления QR нужна роль Собственник, Администратор или Менеджер.</p></main></>);

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await getSupabaseAdminClient()
    .from("bookings")
    .select("id, booking_number, status, check_in, check_out, customers ( full_name ), booking_rooms ( room_unit_id, room_units ( room_number, buildings ( name ) ) )")
    .is("deleted_at", null)
    .in("status", ["confirmed", "checked_in"])
    .gte("check_out", today)
    .order("check_in", { ascending: true });

  const bookings = (data ?? []) as unknown as BookingRow[];
  const stays = bookings.flatMap((booking) => {
    const customer = relationFirst(booking.customers);
    return (booking.booking_rooms ?? []).map((bookingRoom) => {
      const room = relationFirst(bookingRoom.room_units);
      const building = relationFirst(room?.buildings);
      return {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        status: booking.status,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        guestName: customer?.full_name ?? "Гость",
        roomUnitId: bookingRoom.room_unit_id,
        roomNumber: room?.room_number ?? "—",
        buildingName: building?.name ?? "AK BERMET",
      };
    });
  });

  return (<><ManagerHeader title="QR гостей" /><main className="space-y-6 p-4 lg:p-8"><div className="rounded-xl border border-gold/15 bg-white p-5 shadow-soft"><h1 className="font-display text-2xl font-semibold text-emerald-deep">Гостевой сервис по QR</h1><p className="mt-2 max-w-3xl text-sm text-muted">QR выпускается только для подтверждённой или заселённой брони. Он связан с гостем и номером и автоматически перестаёт действовать после выезда, отмены или no-show.</p></div>{error ? <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">Не удалось прочитать активные брони.</p> : <ManagerQrPanel stays={stays} />}</main></>);
}
