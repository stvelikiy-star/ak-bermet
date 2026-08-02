import type { CleaningTaskStatus } from "../types/operations";

export type HousekeepingAction = "accept" | "start" | "complete" | "report_problem";
export type CleaningPhotoPhase = "before" | "after";
export type HousekeepingPriority = "overdue" | "high" | "normal" | "low";

export const CLEANING_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export const MAX_CLEANING_PHOTO_BYTES = 10 * 1024 * 1024;

const ACTION_STATUS: Record<HousekeepingAction, readonly CleaningTaskStatus[]> = {
  accept: ["pending"],
  start: ["accepted"],
  complete: ["in_progress"],
  report_problem: ["pending", "accepted", "in_progress"],
};

export function canPerformHousekeepingAction(
  status: CleaningTaskStatus,
  action: HousekeepingAction
): boolean {
  return ACTION_STATUS[action].includes(status);
}

export function validateHousekeepingAction(
  status: CleaningTaskStatus,
  action: HousekeepingAction
): string | null {
  if (canPerformHousekeepingAction(status, action)) return null;
  return `Действие «${action}» недоступно для статуса «${status}».`;
}

// У cleaning_tasks нет поля priority. В интерфейсе приоритет честно
// вычисляется только из due_by, не выдавая производное значение за колонку БД.
export function getHousekeepingPriority(
  dueBy: string | null,
  nowMs: number = Date.now()
): HousekeepingPriority {
  if (!dueBy) return "low";
  const dueMs = Date.parse(dueBy);
  if (!Number.isFinite(dueMs)) return "low";
  const remaining = dueMs - nowMs;
  if (remaining < 0) return "overdue";
  if (remaining <= 2 * 60 * 60 * 1000) return "high";
  return "normal";
}

export function isValidProblemNote(note: string): boolean {
  return note.trim().length >= 3 && note.trim().length <= 1000;
}

export function validateCleaningPhoto(input: {
  status: CleaningTaskStatus;
  phase: CleaningPhotoPhase;
  storagePath: unknown;
}): string | null {
  const path = typeof input.storagePath === "string" ? input.storagePath.trim() : "";
  if (
    path.length < 3 ||
    path.length > 1000 ||
    path.startsWith("/") ||
    path.includes("..") ||
    /^https?:\/\//i.test(path)
  ) {
    return "Укажите корректный путь фотографии в Supabase Storage.";
  }
  if (!(["pending", "accepted", "in_progress", "problem_reported"] as CleaningTaskStatus[]).includes(input.status)) {
    return "Фотографию нельзя добавить к завершённой или неактивной задаче.";
  }
  if (input.phase === "after" && input.status !== "in_progress" && input.status !== "problem_reported") {
    return "Фото после уборки можно добавить только во время уборки.";
  }
  if (input.phase === "before" && input.status === "problem_reported") {
    return "Фото до должно быть добавлено перед сообщением о проблеме.";
  }
  return null;
}

export function validateCleaningPhotoFile(input: {
  mimeType: unknown;
  size: unknown;
}): string | null {
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
  const size = typeof input.size === "number" ? input.size : Number(input.size);
  if (!(CLEANING_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "Допустимы только фотографии JPEG, PNG, WebP, HEIC или HEIF.";
  }
  if (!Number.isFinite(size) || size <= 0) {
    return "Фотография пуста или повреждена.";
  }
  if (size > MAX_CLEANING_PHOTO_BYTES) {
    return "Размер фотографии не должен превышать 10 МБ.";
  }
  return null;
}

type CleaningPhotoMimeType = (typeof CLEANING_PHOTO_MIME_TYPES)[number];

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 0x100 + bytes[offset + 1];
}

function uint32(bytes: Uint8Array, offset: number, littleEndian = false): number {
  if (littleEndian) {
    return (bytes[offset] + bytes[offset + 1] * 0x100 + bytes[offset + 2] * 0x10000 + bytes[offset + 3] * 0x1000000) >>> 0;
  }
  return (bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3]) >>> 0;
}

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index++) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isStructurallyValidJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  let hasFrame = false;
  let hasScan = false;
  let hasQuantizationTable = false;
  let hasHuffmanTable = false;
  const quantizationTables = new Set<number>();
  const huffmanTables = new Set<string>();
  const frameComponents = new Map<number, number>();
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) return false;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) return false;
    const marker = bytes[offset++];
    if (marker === 0xd9) return hasFrame && hasScan && offset === bytes.length;
    if (marker === 0x00 || marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) return false;
    if (offset + 2 > bytes.length) return false;
    const length = uint16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if (marker === 0xdb) {
      let tableOffset = offset + 2;
      const tableEnd = offset + length;
      while (tableOffset < tableEnd) {
        const precision = bytes[tableOffset] >>> 4;
        const tableId = bytes[tableOffset] & 0x0f;
        if (precision > 1 || tableId > 3) return false;
        quantizationTables.add(tableId);
        tableOffset += 1 + (precision === 0 ? 64 : 128);
        hasQuantizationTable = true;
      }
      if (tableOffset !== tableEnd) return false;
    }
    if (marker === 0xc4) {
      let tableOffset = offset + 2;
      const tableEnd = offset + length;
      while (tableOffset < tableEnd) {
        if (tableOffset + 17 > tableEnd || (bytes[tableOffset] & 0xec) !== 0) return false;
        const tableClass = bytes[tableOffset] >>> 4;
        const tableId = bytes[tableOffset] & 0x0f;
        let symbols = 0;
        for (let index = 1; index <= 16; index++) symbols += bytes[tableOffset + index];
        if (symbols === 0 || symbols > 256 || tableOffset + 17 + symbols > tableEnd) return false;
        tableOffset += 17 + symbols;
        huffmanTables.add(`${tableClass}:${tableId}`);
        hasHuffmanTable = true;
      }
      if (tableOffset !== tableEnd) return false;
    }
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      const components = bytes[offset + 7];
      if (components === 0 || length !== 8 + 3 * components || uint16(bytes, offset + 3) === 0 || uint16(bytes, offset + 5) === 0) return false;
      for (let index = 0; index < components; index++) {
        const componentOffset = offset + 8 + index * 3;
        const componentId = bytes[componentOffset];
        const sampling = bytes[componentOffset + 1];
        const tableId = bytes[componentOffset + 2];
        if (frameComponents.has(componentId) || (sampling >>> 4) === 0 || (sampling & 0x0f) === 0 || tableId > 3) return false;
        frameComponents.set(componentId, tableId);
      }
      hasFrame = true;
    }
    offset += length;
    if (marker === 0xda) {
      if (!hasFrame || !hasQuantizationTable || !hasHuffmanTable) return false;
      const components = bytes[offset + 2];
      if (components === 0 || length !== 6 + 2 * components) return false;
      for (const tableId of frameComponents.values()) {
        if (!quantizationTables.has(tableId)) return false;
      }
      for (let index = 0; index < components; index++) {
        const componentOffset = offset + 3 + index * 2;
        if (!frameComponents.has(bytes[componentOffset])) return false;
        const selectors = bytes[componentOffset + 1];
        if (!huffmanTables.has(`0:${selectors >>> 4}`) || !huffmanTables.has(`1:${selectors & 0x0f}`)) return false;
      }
      hasScan = true;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }
        const next = bytes[offset + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
          offset += 2;
          continue;
        }
        break;
      }
    }
  }
  return false;
}

function isStructurallyValidPng(bytes: Uint8Array): boolean {
  if (bytes.length < 45 || ascii(bytes, 1, 3) !== "PNG" || bytes[0] !== 0x89 || bytes[4] !== 0x0d || bytes[5] !== 0x0a || bytes[6] !== 0x1a || bytes[7] !== 0x0a) return false;
  let offset = 8;
  let chunks = 0;
  let hasImageData = false;
  while (offset + 12 <= bytes.length) {
    const length = uint32(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = ascii(bytes, offset + 4, 4);
    if (crc32(bytes, offset + 4, offset + 8 + length) !== uint32(bytes, offset + 8 + length)) return false;
    if (chunks++ === 0 && (type !== "IHDR" || length !== 13 || uint32(bytes, offset + 8) === 0 || uint32(bytes, offset + 12) === 0)) return false;
    if (type === "IDAT" && length > 0) hasImageData = true;
    if (type === "IEND") return length === 0 && hasImageData && end === bytes.length;
    offset = end;
  }
  return false;
}

function isStructurallyValidWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP" || uint32(bytes, 4, true) + 8 !== bytes.length) return false;
  let offset = 12;
  let imageChunks = 0;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = uint32(bytes, offset + 4, true);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) return false;
    if (["VP8 ", "VP8L", "VP8X"].includes(type) && length > 0) imageChunks++;
    offset = end;
  }
  return offset === bytes.length && imageChunks === 1;
}

function isStructurallyValidHeif(bytes: Uint8Array): boolean {
  let offset = 0;
  let hasFtyp = false;
  let hasMeta = false;
  let hasMediaData = false;
  while (offset + 8 <= bytes.length) {
    const size = uint32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    if (size < 8 || offset + size > bytes.length) return false;
    if (offset === 0 && type === "ftyp" && size >= 16) hasFtyp = true;
    if (type === "meta" && size > 12) hasMeta = true;
    if (type === "mdat" && size > 8) hasMediaData = true;
    offset += size;
  }
  return offset === bytes.length && hasFtyp && hasMeta && hasMediaData;
}

export function detectCleaningPhotoMimeType(bytes: Uint8Array): CleaningPhotoMimeType | null {
  if (isStructurallyValidJpeg(bytes)) {
    return "image/jpeg";
  }
  if (isStructurallyValidPng(bytes)) {
    return "image/png";
  }
  if (isStructurallyValidWebp(bytes)) {
    return "image/webp";
  }
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp" && isStructurallyValidHeif(bytes)) {
    const brand = ascii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return "image/heic";
    if (["heif", "mif1", "msf1"].includes(brand)) return "image/heif";
  }
  return null;
}

export function validateCleaningPhotoBytes(input: {
  bytes: Uint8Array;
  mimeType: unknown;
}): string | null {
  const declaredMimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
  const detectedMimeType = detectCleaningPhotoMimeType(input.bytes);
  if (!detectedMimeType) return "Файл не является поддерживаемым изображением или повреждён.";
  if (detectedMimeType !== declaredMimeType) return "Формат фотографии не соответствует содержимому файла.";
  return null;
}

export function validateRequiredCleaningPhotos(input: {
  action: "complete" | "report_problem";
  phases: readonly CleaningPhotoPhase[];
}): string | null {
  if (input.action === "report_problem" && !input.phases.includes("before")) {
    return "Перед сообщением о проблеме добавьте фото до уборки.";
  }
  if (input.action === "complete") {
    if (!input.phases.includes("before")) {
      return "Перед завершением добавьте фото до уборки.";
    }
    if (!input.phases.includes("after")) {
      return "Перед завершением добавьте фото после уборки.";
    }
  }
  return null;
}
