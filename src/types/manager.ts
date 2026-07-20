import type { Lead, LeadStatus } from "./lead";

// Заявка в кабинете менеджера = Lead + поля обработки.
export interface ManagerLead extends Lead {
  manager?: string;
  managerComment?: string;
}

export interface LeadStatusHistoryItem {
  id: string;
  leadId: string;
  status: LeadStatus;
  manager?: string;
  comment?: string;
  createdAt: string;
}

export type PaymentStatus =
  | "not_sent"
  | "waiting"
  | "paid"
  | "partial"
  | "refunded"
  | "failed";

export interface PaymentRecord {
  id: string;
  leadId: string;
  client: string;
  total: number;
  prepayment: number;
  paid: number;
  balance: number;
  method?: string;
  status: PaymentStatus;
  date?: string;
  comment?: string;
}

export interface ManagerStats {
  newLeads: number;
  inProgress: number;
  waitingPrepayment: number;
  confirmed: number;
  events: number;
  prepaymentSum: number;
}
