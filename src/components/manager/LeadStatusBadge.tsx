import type { LeadStatus } from "@/types/lead";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/manager-utils";

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
