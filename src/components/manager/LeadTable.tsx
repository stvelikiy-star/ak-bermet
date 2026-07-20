import type { ManagerLead } from "@/types/manager";
import LeadStatusBadge from "./LeadStatusBadge";
import {
  INTEREST_LABELS,
  SOURCE_LABELS,
  formatDate,
  leadDates,
  leadGuests,
  managerWhatsAppUrl,
} from "@/lib/manager-utils";
import { IconWhatsApp } from "@/components/ui/icons";

export default function LeadTable({
  leads,
  onOpen,
}: {
  leads: ManagerLead[];
  onOpen: (lead: ManagerLead) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gold/15 bg-white shadow-soft">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-gold/15 bg-cream/60 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Дата</th>
            <th className="px-4 py-3 font-medium">Имя</th>
            <th className="px-4 py-3 font-medium">Телефон</th>
            <th className="px-4 py-3 font-medium">Интерес</th>
            <th className="px-4 py-3 font-medium">Даты</th>
            <th className="px-4 py-3 font-medium">Гости</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Источник</th>
            <th className="px-4 py-3 font-medium">Ответственный</th>
            <th className="px-4 py-3 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gold/10">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-cream/40">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                {lead.id.replace("lead_", "")}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {formatDate(lead.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-deep">
                {lead.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {lead.phone}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-emerald-deep">
                {INTEREST_LABELS[lead.interest]}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {leadDates(lead)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {leadGuests(lead)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <LeadStatusBadge status={lead.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {SOURCE_LABELS[lead.source]}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {lead.manager ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(lead)}
                    className="rounded-full bg-emerald-deep px-3 py-1.5 text-xs font-semibold text-gold-soft"
                  >
                    Открыть
                  </button>
                  <a
                    href={managerWhatsAppUrl(lead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="rounded-full border border-gold/40 p-1.5 text-emerald-deep"
                  >
                    <IconWhatsApp className="h-4 w-4" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-center text-muted">
                Заявки не найдены.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
