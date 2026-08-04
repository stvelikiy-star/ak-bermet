import { createHash, randomUUID } from "node:crypto";
import type { Lead } from "@/types/lead";
import type { ManagerLead } from "@/types/manager";
import type { RoomUnit, OccupancyRecord } from "@/types/availability";
import type { LeadStatus } from "@/types/lead";

// Клиент Google Sheets для заявок (и архитектура под доступность).
// Работает только при GOOGLE_SHEETS_ENABLED=true и заданных кредах;
// рабочие CRM-маршруты явно сообщают об отсутствии источника.

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

// Fabricated inventory and process-local holds are development aids only.
// A production deployment with missing/incomplete Sheets configuration must
// fail closed: treating it as mock would make holds instance-local and allow
// conflicting bookings after a restart or on another server instance.
export function isLocalMockAvailabilityAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  );
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
  "roomUnitId",
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
  "sourceUpdatedAt",
] as const;

const toBool = (v: string) => v?.trim().toLowerCase() === "да" || v === "true";
const toNum = (v: string) => (v ? Number(v) : undefined);

// Preserve an absent/unknown operational status instead of inventing
// `active`. The availability boundary validates the complete inventory and
// fails closed before GET results or a hold RPC can use such a row.
export function roomRowToRoomUnit(row: readonly unknown[]): RoomUnit {
  const g = (key: (typeof ROOMS_COLS)[number]) =>
    String(row[ROOMS_COLS.indexOf(key)] ?? "");
  return {
    id: g("id"),
    roomUnitId: g("roomUnitId") || undefined,
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
    repairLevel: (g("repairLevel") || undefined) as RoomUnit["repairLevel"],
    distanceToSpaMeters: toNum(g("distanceToSpaMeters")),
    distanceToBeachMeters: toNum(g("distanceToBeachMeters")),
    status: g("status") as RoomUnit["status"],
    notes: g("notes") || undefined,
  };
}

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
      range: `${SHEET.rooms}!A2:Q`,
    });
    const rows = res.data.values ?? [];
    return rows.filter((r) => r[0]).map(roomRowToRoomUnit);
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
      range: `${SHEET.occupancy}!A2:K`,
    });
    const rows = res.data.values ?? [];
    return rows
      // Preserve every non-empty source row. In particular, a booking row
      // with a missing stable id must reach contract validation and fail
      // closed; filtering on column A would silently erase that evidence.
      .filter((r) => r.some((value) => String(value ?? "").trim().length > 0))
      .map(occupancyRowToRecord);
  } catch (e) {
    console.error("[SHEETS] getOccupancyFromSheet failed:", e);
    throw e;
  }
}

// Preserve incomplete authoritative values at the adapter boundary. In
// particular, an empty status must not be converted into a valid blocking
// state: prepareSheetsBookingSyncEvents validates the complete row and stops
// the transactional hold RPC with OWNER_ACTION_REQUIRED.
export function occupancyRowToRecord(row: readonly unknown[]): OccupancyRecord {
  const g = (key: (typeof OCCUPANCY_COLS)[number]) =>
    String(row[OCCUPANCY_COLS.indexOf(key)] ?? "");
  return {
    id: g("id"),
    roomId: g("roomId"),
    checkIn: g("checkIn"),
    checkOut: g("checkOut"),
    status: g("status") as OccupancyRecord["status"],
    guestName: g("guestName") || undefined,
    guestPhone: g("guestPhone") || undefined,
    source: g("source") || undefined,
    manager: g("manager") || undefined,
    notes: g("notes") || undefined,
    sourceUpdatedAt: g("sourceUpdatedAt") || undefined,
  };
}

// ── Менеджер: чтение и обновление заявок (Stage 09) ────────────

const yesNoToBool = (v: string) => (v ?? "").trim().toLowerCase() === "да";
const numOrUndef = (v: string) => (v ? Number(v) : undefined);
const LEAD_UPDATE_CLAIM_MARKER = "lead_update_claim_v2";

function applyCompletedLeadUpdates(
  leads: ManagerLead[],
  historyRows: unknown[][]
): ManagerLead[] {
  const eventsByLead = new Map<string, unknown[][]>();
  for (const row of historyRows) {
    const leadId = String(row[1] ?? "");
    const token = String(row[8] ?? "");
    // A completed claim keeps its immutable fence in G:K and records the
    // business event in A:F. An incomplete claim must never become visible.
    if (
      !leadId ||
      String(row[6] ?? "") !== LEAD_UPDATE_CLAIM_MARKER ||
      String(row[0] ?? "") !== `h_${token}` ||
      String(row[2] ?? "") !== String(row[10] ?? "")
    ) {
      continue;
    }
    const events = eventsByLead.get(leadId) ?? [];
    events.push(row);
    eventsByLead.set(leadId, events);
  }

  return leads.map((lead) => {
    let current = lead;
    for (const row of eventsByLead.get(lead.id) ?? []) {
      if (String(row[7] ?? "") !== (current.updatedAt ?? "")) continue;
      current = {
        ...current,
        status: String(row[3] ?? "") as LeadStatus,
        manager: String(row[4] ?? "") || undefined,
        managerComment: String(row[5] ?? "") || undefined,
        updatedAt: String(row[10] ?? "") || undefined,
      };
    }
    return current;
  });
}

// Читает лист «Заявки» в массив Lead (с полями менеджера).
export async function getLeadsFromSheet(): Promise<ManagerLead[]> {
  if (!isGoogleSheetsEnabled()) return [];
  try {
    const { sheets, spreadsheetId } = await getClient();
    const [res, history] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET.leads}!A2:Z`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET.history}!A:K`,
      }),
    ]);
    const rows = res.data.values ?? [];
    const leads = rows
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
          updatedAt: g(25) || undefined,
        } satisfies ManagerLead;
      });
    return applyCompletedLeadUpdates(leads, history.data.values ?? []);
  } catch (e) {
    console.error("[SHEETS] getLeadsFromSheet failed:", e);
    throw e;
  }
}

export class StaleLeadError extends Error {
  constructor() {
    super("Lead was updated after it was loaded");
    this.name = "StaleLeadError";
  }
}

// values.batchUpdate не поддерживает compare-and-swap: проверка Z и запись
// отдельными запросами оставляет окно для lost update. append, напротив,
// атомарно назначает строкам порядок. Храним в дополнительных колонках
// журнала неизменяемые заявки на обновление и разрешаем запись только первой
// заявке для конкретной версии лида. Это работает и между разными процессами
// приложения, в отличие от локального mutex.
// Claims are permanent version fences. Google Sheets does not provide a
// compare-and-swap for values, so expiring a claim would let an old worker
// resume after a recovery write and overwrite newer data. A retry of the same
// operation can still resume through operationKey. A different operation
// first completes the immutable winning payload and then must reload the lead
// before claiming its new version.

type LeadVersionClaim = {
  historyRow: number;
  token: string;
  updatedAt: string;
  operationKey: string;
  status: LeadStatus;
  managerName: string;
  managerComment: string;
};

async function claimLeadVersion(input: {
  sheets: Awaited<ReturnType<typeof getClient>>["sheets"];
  spreadsheetId: string;
  leadId: string;
  expectedUpdatedAt: string | null;
  operationKey: string;
  status: LeadStatus;
  managerName: string;
  managerComment: string;
}): Promise<LeadVersionClaim> {
  const expectedVersion = input.expectedUpdatedAt ?? "";

  const readClaims = async () => {
    const response = await input.sheets.spreadsheets.values.get({
      spreadsheetId: input.spreadsheetId,
      // Читаем и первую строку: старые таблицы могли быть созданы без шапки.
      range: `${SHEET.history}!A:N`,
    });
    return response.data.values ?? [];
  };

  const findClaim = (rows: unknown[][]) => {
    const rowIndex = rows.findIndex(
      (row) =>
        String(row[1] ?? "") === input.leadId &&
        String(row[6] ?? "") === LEAD_UPDATE_CLAIM_MARKER &&
        String(row[7] ?? "") === expectedVersion
    );
    if (rowIndex === -1) return null;
    const row = rows[rowIndex];
    const operationKey = String(row[9] ?? "");
    // L:N make an interrupted winning operation recoverable by a later
    // request. Older claims without a payload remain fail-closed because
    // inventing their business values would corrupt CRM state.
    if (!row[11]) throw new StaleLeadError();
    return {
      historyRow: rowIndex + 1,
      token: String(row[8] ?? ""),
      updatedAt: String(row[10] ?? ""),
      operationKey,
      status: String(row[11]) as LeadStatus,
      managerName: String(row[12] ?? ""),
      managerComment: String(row[13] ?? ""),
    } satisfies LeadVersionClaim;
  };

  // Повтор после неопределённого результата записи продолжает ту же операцию,
  // а не создаёт конфликт с собственной ранее записанной заявкой.
  const existingClaim = findClaim(await readClaims());
  if (existingClaim) return existingClaim;

  const token = randomUUID();
  const now = new Date().toISOString();
  const updatedAt =
    now === expectedVersion
      ? new Date(new Date(now).getTime() + 1).toISOString()
      : now;

  await input.sheets.spreadsheets.values.append({
    spreadsheetId: input.spreadsheetId,
    range: `${SHEET.history}!A:N`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      // A:F остаются совместимыми с форматом истории; служебные данные
      // находятся в G:N и не выглядят как бизнес-событие.
      values: [
        [
          "",
          input.leadId,
          new Date().toISOString(),
          "",
          "",
          "",
          LEAD_UPDATE_CLAIM_MARKER,
          expectedVersion,
          token,
          input.operationKey,
          updatedAt,
          input.status,
          input.managerName,
          input.managerComment,
        ],
      ],
    },
  });

  const winningClaim = findClaim(await readClaims());
  if (!winningClaim) throw new Error("Lead update claim was not persisted");
  return winningClaim;
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
  expectedUpdatedAt: string | null;
}): Promise<string> {
  if (!isGoogleSheetsEnabled()) {
    throw new Error("Google Sheets is not configured");
  }
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

  const operationKey = createHash("sha256")
    .update(
      JSON.stringify([
        input.leadId,
        input.expectedUpdatedAt ?? "",
        input.status,
        input.managerComment ?? "",
        input.managerName ?? "",
      ])
    )
    .digest("hex");
  const claim = await claimLeadVersion({
    sheets,
    spreadsheetId,
    leadId: input.leadId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    operationKey,
    status: input.status,
    managerName: input.managerName ?? "",
    managerComment: input.managerComment ?? "",
  });

  const history = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET.history}!A:N`,
  });
  const [currentLead] = applyCompletedLeadUpdates(
    [
      {
        id: input.leadId,
        updatedAt: String(rows[idx]?.[25] ?? "") || undefined,
      } as ManagerLead,
    ],
    history.data.values ?? []
  );
  const currentUpdatedAt = currentLead.updatedAt ?? "";
  // Предыдущая попытка могла применить batchUpdate, но потерять HTTP-ответ.
  if (currentUpdatedAt === claim.updatedAt) {
    if (claim.operationKey !== operationKey) throw new StaleLeadError();
    return claim.updatedAt;
  }
  if (currentUpdatedAt !== (input.expectedUpdatedAt ?? "")) {
    throw new StaleLeadError();
  }

  const historyId = `h_${claim.token}`;
  // Complete only this operation's immutable claim row. Lead reads fold the
  // completed claim chain, so a paused old worker can never overwrite fields
  // produced by a newer version.
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      // CRM fields are untrusted text. RAW prevents comments or staff names
      // beginning with formula markers from being evaluated by Google Sheets.
      valueInputOption: "RAW",
      data: [
        {
          range: `${SHEET.history}!A${claim.historyRow}:F${claim.historyRow}`,
          values: [
            [
              historyId,
              input.leadId,
              claim.updatedAt,
              claim.status,
              claim.managerName,
              claim.managerComment,
            ],
          ],
        },
      ],
    },
  });
  // A different request may recover the immutable winning operation, but it
  // must not report its own payload as applied. The caller reloads the lead
  // and retries against the recovered version.
  if (claim.operationKey !== operationKey) throw new StaleLeadError();
  return claim.updatedAt;
}
