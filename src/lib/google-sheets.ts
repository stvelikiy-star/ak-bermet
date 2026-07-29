import type { Lead } from "@/types/lead";
import type { RoomUnit, OccupancyRecord } from "@/types/availability";
import type { LeadStatus } from "@/types/lead";

// Клиент Google Sheets для заявок (и архитектура под доступность).
// Работает только при GOOGLE_SHEETS_ENABLED=true и заданных кредах;
// иначе вызывающий код использует fallback / mock.

type Creds = { spreadsheetId: string; email: string; key: string };

function getCreds(): Creds | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!spreadsheetId || !email || !key) return null;
  // Приватный ключ из .env часто хранится с экранированными \n.
  key = key.replace(/\\n/g, "\n");
  return { spreadsheetId, email, key };
}

export function isGoogleSheetsEnabled(): boolean {
  return process.env.GOOGLE_SHEETS_ENABLED === "true" && getCreds() !== null;
}

// Названия листов (можно переопределить через env).
const SHEET = {
  leads: process.env.GOOGLE_SHEETS_LEADS_SHEET_NAME || "Заявки",
  occupancy: process.env.GOOGLE_SHEETS_OCCUPANCY_SHEET_NAME || "Занятость",
  rooms: process.env.GOOGLE_SHEETS_ROOMS_SHEET_NAME || "Номерной фонд",
  history:
    process.env.GOOGLE_SHEETS_LEAD_HISTORY_SHEET_NAME || "История заявок",
};

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Ленивая инициализация клиента (googleapis грузится только при необходимости).
async function getClient() {
  const creds = getCreds();
  if (!creds) throw new Error("Google Sheets credentials are not configured");
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: SCOPES,
  });
  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId: creds.spreadsheetId };
}

// ── Преобразование заявки в строку листа «Заявки» ──────────────
// Порядок колонок зафиксирован спецификацией Stage 05.
const yesNo = (v?: boolean): string => (v === undefined ? "" : v ? "Да" : "Нет");
const text = (v: unknown): string =>
  v === undefined || v === null ? "" : String(v);
const num = (v?: number): string | number => (v === undefined ? "" : v);

function leadToRow(lead: Lead): (string | number)[] {
  return [
    lead.id, // ID
    lead.createdAt, // Дата создания
    lead.source, // Источник
    lead.interest, // Интерес
    lead.status, // Статус
    lead.name, // Имя
    lead.phone, // Телефон
    text(lead.checkIn), // Дата заезда
    text(lead.checkOut), // Дата выезда
    num(lead.adults), // Взрослые
    num(lead.children), // Дети
    text(lead.childrenAges), // Возраст детей
    text(lead.roomCategory), // Категория номера
    yesNo(lead.wantsDoubleBed), // Двуспальная кровать
    yesNo(lead.needsExtraBed), // Доп. место
    yesNo(lead.needsWifi), // Wi-Fi
    yesNo(lead.needsLowerFloor), // Нижний этаж
    text(lead.eventType), // Тип мероприятия
    num(lead.guestsCount), // Количество гостей
    text(lead.hallSize), // Зал
    text(lead.spaService), // SPA услуга
    text(lead.message), // Сообщение
    text(lead.preferredContact), // Предпочтительный контакт
    "", // Менеджер
    "", // Комментарий менеджера
    "", // Дата последнего обновления
  ];
}

// Добавляет заявку в лист «Заявки». Бросает исключение при ошибке —
// вызывающий код (route) обрабатывает её и не показывает детали пользователю.
export async function appendLeadToSheet(lead: Lead): Promise<void> {
  const { sheets, spreadsheetId } = await getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET.leads}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [leadToRow(lead)] },
  });
}

// ── Архитектура под доступность (Stage 06) ─────────────────────
// Порядок колонок листов «Номерной фонд» и «Занятость».
const ROOMS_COLS = [
  "id",
  "building",
  "floor",
  "roomNumber",
  "category",
  "bedType",
  "capacity",
  "hasSofa",
  "allowsExtraBed",
  "view",
  "hasWifi",
  "repairLevel",
  "distanceToSpaMeters",
  "distanceToBeachMeters",
  "status",
  "notes",
] as const;

const OCCUPANCY_COLS = [
  "id",
  "roomId",
  "checkIn",
  "checkOut",
  "status",
  "guestName",
  "guestPhone",
  "source",
  "manager",
  "notes",
] as const;

const toBool = (v: string) => v?.trim().toLowerCase() === "да" || v === "true";
const toNum = (v: string) => (v ? Number(v) : undefined);

// Читает «Номерной фонд». Если лист не подключён — возвращает [].
//
// Ошибка чтения НЕ проглатывается (см. getOccupancyFromSheet): пустой
// список неотличим от «в листе реально нет номеров», поэтому при сбое
// чтения бросаем исключение — вызывающий код обязан считать номерной
// фонд неизвестным, а не тихо переключаться на mock-данные (fail-open).
export async function getRoomsFromSheet(): Promise<RoomUnit[]> {
  if (!isGoogleSheetsEnabled()) return [];
  // TODO Stage 06: финализировать структуру листа «Номерной фонд».
  try {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET.rooms}!A2:P`,
    });
    const rows = res.data.values ?? [];
    return rows
      .filter((r) => r[0])
      .map((r) => {
        const g = (k: (typeof ROOMS_COLS)[number]) =>
          (r[ROOMS_COLS.indexOf(k)] ?? "") as string;
        return {
          id: g("id"),
          building: g("building"),
          floor: toNum(g("floor")),
          roomNumber: g("roomNumber") || undefined,
          category: g("category"),
          bedType: (g("bedType") || undefined) as RoomUnit["bedType"],
          capacity: toNum(g("capacity")) ?? 1,
          hasSofa: g("hasSofa") ? toBool(g("hasSofa")) : undefined,
          allowsExtraBed: g("allowsExtraBed")
            ? toBool(g("allowsExtraBed"))
            : undefined,
          view: (g("view") || undefined) as RoomUnit["view"],
          hasWifi: g("hasWifi") ? toBool(g("hasWifi")) : undefined,
          repairLevel: (g("repairLevel") ||
            undefined) as RoomUnit["repairLevel"],
          distanceToSpaMeters: toNum(g("distanceToSpaMeters")),
          distanceToBeachMeters: toNum(g("distanceToBeachMeters")),
          status: (g("status") || "active") as RoomUnit["status"],
          notes: g("notes") || undefined,
        } satisfies RoomUnit;
      });
  } catch (e) {
    console.error("[SHEETS] getRoomsFromSheet failed:", e);
    throw e;
  }
}

// Читает «Занятость». Если лист не подключён — возвращает [].
//
// В отличие от getRoomsFromSheet ошибка чтения НЕ проглатывается: пустой
// список занятости неотличим от «реальной занятости нет», поэтому при сбое
// чтения нужно явно сообщить вызывающему коду, а не тихо отдать [] — иначе
// доступность и удержания будут считаться по неполным данным (fail-open).
export async function getOccupancyFromSheet(): Promise<OccupancyRecord[]> {
  if (!isGoogleSheetsEnabled()) return [];
  // TODO Stage 06: финализировать структуру листа «Занятость».
  try {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET.occupancy}!A2:J`,
    });
    const rows = res.data.values ?? [];
    return rows
      .filter((r) => r[0])
      .map((r) => {
        const g = (k: (typeof OCCUPANCY_COLS)[number]) =>
          (r[OCCUPANCY_COLS.indexOf(k)] ?? "") as string;
        return {
          id: g("id"),
          roomId: g("roomId"),
          checkIn: g("checkIn"),
          checkOut: g("checkOut"),
          status: (g("status") || "pre_hold") as OccupancyRecord["status"],
          guestName: g("guestName") || undefined,
          guestPhone: g("guestPhone") || undefined,
          source: g("source") || undefined,
          manager: g("manager") || undefined,
          notes: g("notes") || undefined,
        } satisfies OccupancyRecord;
      });
  } catch (e) {
    console.error("[SHEETS] getOccupancyFromSheet failed:", e);
    throw e;
  }
}

// ── Менеджер: чтение и обновление заявок (Stage 09) ────────────

const yesNoToBool = (v: string) => (v ?? "").trim().toLowerCase() === "да";
const numOrUndef = (v: string) => (v ? Number(v) : undefined);

// Читает лист «Заявки» в массив Lead (с полями менеджера).
export async function getLeadsFromSheet(): Promise<Lead[]> {
  if (!isGoogleSheetsEnabled()) return [];
  try {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET.leads}!A2:Z`,
    });
    const rows = res.data.values ?? [];
    return rows
      .filter((r) => r[0])
      .map((r) => {
        const g = (i: number) => (r[i] ?? "") as string;
        return {
          id: g(0),
          createdAt: g(1),
          source: (g(2) || "website") as Lead["source"],
          interest: (g(3) || "general") as Lead["interest"],
          status: (g(4) || "new") as LeadStatus,
          name: g(5),
          phone: g(6),
          checkIn: g(7) || undefined,
          checkOut: g(8) || undefined,
          adults: numOrUndef(g(9)),
          children: numOrUndef(g(10)),
          childrenAges: g(11) || undefined,
          roomCategory: g(12) || undefined,
          wantsDoubleBed: g(13) ? yesNoToBool(g(13)) : undefined,
          needsExtraBed: g(14) ? yesNoToBool(g(14)) : undefined,
          needsWifi: g(15) ? yesNoToBool(g(15)) : undefined,
          needsLowerFloor: g(16) ? yesNoToBool(g(16)) : undefined,
          eventType: g(17) || undefined,
          guestsCount: numOrUndef(g(18)),
          hallSize: g(19) || undefined,
          spaService: g(20) || undefined,
          message: g(21) || undefined,
          preferredContact: (g(22) || undefined) as Lead["preferredContact"],
          manager: g(23) || undefined,
          managerComment: g(24) || undefined,
        } as Lead;
      });
  } catch (e) {
    console.error("[SHEETS] getLeadsFromSheet failed:", e);
    return [];
  }
}

// Добавляет строку в лист «История заявок».
export async function appendLeadHistoryToSheet(input: {
  leadId: string;
  status: LeadStatus;
  managerComment?: string;
  managerName?: string;
  createdAt: string;
}): Promise<void> {
  if (!isGoogleSheetsEnabled()) return;
  const { sheets, spreadsheetId } = await getClient();
  const historyId = `h_${Date.now().toString(36)}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET.history}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          historyId,
          input.leadId,
          input.createdAt,
          input.status,
          input.managerName ?? "",
          input.managerComment ?? "",
        ],
      ],
    },
  });
}

// Находит заявку по ID и обновляет статус/менеджера/комментарий + историю.
export async function updateLeadStatusInSheet(input: {
  leadId: string;
  status: LeadStatus;
  managerComment?: string;
  managerName?: string;
}): Promise<void> {
  if (!isGoogleSheetsEnabled()) return;
  const { sheets, spreadsheetId } = await getClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET.leads}!A2:Z`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => (r[0] ?? "") === input.leadId);
  if (idx === -1) {
    throw new Error(`Заявка с ID ${input.leadId} не найдена в листе «Заявки»`);
  }

  const rowNumber = idx + 2; // +1 заголовок, +1 1-based
  const updatedAt = new Date().toISOString();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: `${SHEET.leads}!E${rowNumber}`, values: [[input.status]] },
        {
          range: `${SHEET.leads}!X${rowNumber}:Z${rowNumber}`,
          values: [[input.managerName ?? "", input.managerComment ?? "", updatedAt]],
        },
      ],
    },
  });

  await appendLeadHistoryToSheet({
    leadId: input.leadId,
    status: input.status,
    managerComment: input.managerComment,
    managerName: input.managerName,
    createdAt: updatedAt,
  });
}
