import type { RoleName } from "@/types/auth";

export type StaffCapability =
  | "overview"
  | "crm"
  | "customers"
  | "bookings"
  | "availability"
  | "payments"
  | "reports"
  | "staff_assignments"
  | "operations"
  | "inspections"
  | "cleaning_assigned"
  | "maintenance_assigned"
  | "settings";

export interface StaffSlot {
  readonly id: string;
  readonly label: string;
  readonly role: RoleName;
}

export const STAFF_ROLE_CAPABILITIES: Record<RoleName, readonly StaffCapability[]> = {
  owner: [
    "overview",
    "crm",
    "customers",
    "bookings",
    "availability",
    "payments",
    "reports",
    "staff_assignments",
    "operations",
    "inspections",
    "settings",
  ],
  administrator: [
    "overview",
    "crm",
    "customers",
    "bookings",
    "availability",
    "staff_assignments",
    "operations",
    "inspections",
  ],
  manager: [
    "overview",
    "crm",
    "customers",
    "bookings",
    "availability",
    "payments",
  ],
  housekeeping: ["cleaning_assigned"],
  technician: ["maintenance_assigned"],
};

export const STAFF_SLOTS: readonly StaffSlot[] = [
  { id: "owner-1", label: "Собственник 1", role: "owner" },
  { id: "administrator-1", label: "Администратор 1", role: "administrator" },
  { id: "manager-1", label: "Менеджер 1", role: "manager" },
  { id: "manager-2", label: "Менеджер 2", role: "manager" },
  { id: "manager-3", label: "Менеджер 3", role: "manager" },
  { id: "manager-4", label: "Менеджер 4", role: "manager" },
  { id: "housekeeping-1", label: "Горничная 1", role: "housekeeping" },
  { id: "housekeeping-2", label: "Горничная 2", role: "housekeeping" },
  { id: "housekeeping-3", label: "Горничная 3", role: "housekeeping" },
  { id: "housekeeping-4", label: "Горничная 4", role: "housekeeping" },
  { id: "housekeeping-5", label: "Горничная 5", role: "housekeeping" },
  { id: "housekeeping-6", label: "Горничная 6", role: "housekeeping" },
  { id: "technician-1", label: "Техник 1", role: "technician" },
  { id: "technician-2", label: "Техник 2", role: "technician" },
  { id: "technician-3", label: "Техник 3", role: "technician" },
  { id: "technician-4", label: "Техник 4", role: "technician" },
  { id: "technician-5", label: "Техник 5", role: "technician" },
] as const;

export const STAFF_SLOT_COUNT = STAFF_SLOTS.length;
