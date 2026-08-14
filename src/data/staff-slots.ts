import type { RoleName } from "@/types/auth";

export interface StaffSlot {
  readonly id: string;
  readonly label: string;
  readonly role: RoleName;
  readonly capabilities: readonly string[];
  readonly restrictions: readonly string[];
}

export const STAFF_ROLE_CAPABILITIES: Record<RoleName, readonly string[]> = {
  owner: [
    "Полный операционный обзор CRM",
    "Бронирования, занятость, клиенты и оплаты",
    "Контроль сотрудников и назначений",
    "Уборка, ремонт и обязательные проверки",
    "Отчёты и системные настройки",
  ],
  administrator: [
    "Бронирования, шахматка и статусы номеров",
    "Назначение уборки и ремонта",
    "Обязательные проверки после проблем и ремонта",
    "Управление рабочими ролями и назначениями",
    "Операционный контроль без owner-only аудита",
  ],
  manager: [
    "Лиды, клиенты и коммуникации",
    "Бронирования, удержания и шахматка",
    "Свободные номера и подбор размещения",
    "Оплаты и коммерческий статус бронирования",
  ],
  housekeeping: [
    "Только назначенные задания на уборку",
    "Принять задачу, начать и завершить уборку",
    "Зафиксировать найденную проблему",
    "Загрузить фото до/после в рамках своей задачи",
  ],
  technician: [
    "Только назначенные заявки на ремонт",
    "Диагностика, ход работ и материалы",
    "Завершение ремонта и фото результата",
    "Передача номера на обязательную проверку при блокирующей проблеме",
  ],
};

export const STAFF_ROLE_RESTRICTIONS: Record<RoleName, readonly string[]> = {
  owner: [],
  administrator: ["Нет доступа к owner-only аудиту без роли owner"],
  manager: [
    "Не меняет системные настройки и роли сотрудников",
    "Не управляет техническими блокировками как администратор",
  ],
  housekeeping: [
    "Нет доступа к финансам, CRM и полным данным гостей",
    "Не меняет бронирования, цены или статусы ремонта",
    "Не видит чужие задания без назначения",
  ],
  technician: [
    "Нет доступа к финансам, CRM и полным данным гостей",
    "Не меняет бронирования, цены или задания уборки",
    "Не видит чужие ремонтные заявки без назначения",
  ],
};

function makeSlots(role: RoleName, prefix: string, count: number): StaffSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${role}-${index + 1}`,
    label: `${prefix} ${index + 1}`,
    role,
    capabilities: STAFF_ROLE_CAPABILITIES[role],
    restrictions: STAFF_ROLE_RESTRICTIONS[role],
  }));
}

export const STAFF_SLOTS: readonly StaffSlot[] = [
  ...makeSlots("owner", "Собственник", 1),
  ...makeSlots("administrator", "Администратор", 1),
  ...makeSlots("manager", "Менеджер", 4),
  ...makeSlots("housekeeping", "Горничная", 6),
  ...makeSlots("technician", "Техник", 5),
];

export const STAFF_SLOT_TOTAL = STAFF_SLOTS.length;

export const STAFF_SLOT_COUNTS: Record<RoleName, number> = STAFF_SLOTS.reduce(
  (counts, slot) => {
    counts[slot.role] += 1;
    return counts;
  },
  {
    owner: 0,
    administrator: 0,
    manager: 0,
    housekeeping: 0,
    technician: 0,
  } as Record<RoleName, number>,
);
