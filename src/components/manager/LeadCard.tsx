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

export default function LeadCard({
  lead,
  onOpen,
}: {
  lead: ManagerLead;
  onOpen: (lead: ManagerLead) => void;
}) {
  return (
    <div className="rounded-xl border border-gold/15 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-emerald-deep">{lead.name}</p>
          <p className="text-sm text-muted">{lead.phone}</p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
        <div>
          <dt className="text-muted/70">Направление</dt>
          <dd className="text-emerald-deep">{INTEREST_LABELS[lead.interest]}</dd>
        </div>
        <div>
          <dt className="text-muted/70">Источник</dt>
          <dd className="text-emerald-deep">{SOURCE_LABELS[lead.source]}</dd>
        </div>
        <div>
          <dt className="text-muted/70">Даты</dt>
          <dd className="text-emerald-deep">{leadDates(lead)}</dd>
        </div>
        <div>
          <dt className="text-muted/70">Гости</dt>
          <dd className="text-emerald-deep">{leadGuests(lead)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-muted/70">
        Создана: {formatDate(lead.createdAt)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onOpen(lead)}
          className="flex-1 rounded-full bg-emerald-deep px-3 py-2 text-xs font-semibold text-gold-soft"
        >
          Открыть
        </button>
        <a
          href={managerWhatsAppUrl(lead)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-full border border-gold/40 px-3 py-2 text-xs font-semibold text-emerald-deep"
        >
          <IconWhatsApp className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
