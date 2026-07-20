import type { Lead, LeadStatus } from "@/types/lead";
import type {
  ManagerLead,
  ManagerStats,
  PaymentStatus,
} from "@/types/manager";
import { createWhatsAppUrl } from "@/lib/whatsapp";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  waiting_admin: "Ожидает администратора",
  waiting_prepayment: "Ожидает предоплату",
  prepaid: "Предоплата получена",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  lost: "Потеряна",
};

export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "in_progress",
  "waiting_admin",
  "waiting_prepayment",
  "prepaid",
  "confirmed",
  "cancelled",
  "lost",
];

// Цвета бейджей статусов.
export const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 ring-blue-200",
  in_progress: "bg-amber-100 text-amber-700 ring-amber-200",
  waiting_admin: "bg-purple-100 text-purple-700 ring-purple-200",
  waiting_prepayment: "bg-orange-100 text-orange-700 ring-orange-200",
  prepaid: "bg-teal-100 text-teal-700 ring-teal-200",
  confirmed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 ring-gray-200",
  lost: "bg-red-100 text-red-700 ring-red-200",
};

export const INTEREST_LABELS: Record<string, string> = {
  rooms: "Номера",
  garden: "Garden",
  hot_springs: "Источники",
  spa: "SPA",
  events: "Мероприятия",
  food: "Питание",
  promo: "Акция",
  general: "Общий",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Сайт",
  ai_chat: "AI-чат",
  whatsapp: "WhatsApp",
  phone: "Телефон",
  instagram: "Instagram",
  tour_agency: "Турагентство",
  manual: "Вручную",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  not_sent: "Не отправлено",
  waiting: "Ожидает",
  paid: "Оплачено",
  partial: "Частично",
  refunded: "Возврат",
  failed: "Ошибка",
};

export const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  not_sent: "bg-gray-100 text-gray-600 ring-gray-200",
  waiting: "bg-amber-100 text-amber-700 ring-amber-200",
  paid: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  partial: "bg-orange-100 text-orange-700 ring-orange-200",
  refunded: "bg-purple-100 text-purple-700 ring-purple-200",
  failed: "bg-red-100 text-red-700 ring-red-200",
};

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function leadDates(lead: Lead): string {
  if (lead.checkIn && lead.checkOut)
    return `${formatDate(lead.checkIn)} — ${formatDate(lead.checkOut)}`;
  if (lead.checkIn) return formatDate(lead.checkIn);
  return "—";
}

export function leadGuests(lead: Lead): string {
  const parts: string[] = [];
  if (lead.adults != null) parts.push(`${lead.adults} взр.`);
  if (lead.children) parts.push(`${lead.children} дет.`);
  if (lead.guestsCount != null) parts.push(`${lead.guestsCount} гост.`);
  return parts.length ? parts.join(", ") : "—";
}

export function computeStats(leads: ManagerLead[]): ManagerStats {
  const prepaymentSum = leads
    .filter((l) => l.status === "prepaid" || l.status === "confirmed")
    .reduce((sum) => sum + 0, 0);
  return {
    newLeads: leads.filter((l) => l.status === "new").length,
    inProgress: leads.filter((l) => l.status === "in_progress").length,
    waitingPrepayment: leads.filter((l) => l.status === "waiting_prepayment")
      .length,
    confirmed: leads.filter((l) => l.status === "confirmed").length,
    events: leads.filter((l) => l.interest === "events").length,
    prepaymentSum,
  };
}

// WhatsApp-текст для связи менеджера с клиентом.
export function managerWhatsAppUrl(lead: Lead): string {
  const name = lead.name || "";
  const text =
    lead.interest === "events"
      ? `Здравствуйте, ${name}! Это Ак-Бермет. Мы получили вашу заявку на мероприятие и хотим уточнить детали: дату, количество гостей, зал, питание и проживание.`
      : `Здравствуйте, ${name}! Это Ак-Бермет. Мы получили вашу заявку и хотим уточнить детали бронирования.`;
  return createWhatsAppUrl(lead.phone, text);
}
