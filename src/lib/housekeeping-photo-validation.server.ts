import "server-only";

import { inflateSync } from "node:zlib";

import { validateCleaningPhotoBytes } from "./housekeeping-rules";

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3]) >>> 0;
}

function validateDecodedPng(bytes: Uint8Array): boolean {
  const width = uint32(bytes, 16);
  const height = uint32(bytes, 20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlace = bytes[28];
  const channels = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]).get(colorType);
  const allowedDepths: Record<number, readonly number[]> = {
    0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16],
  };
  if (!channels || !allowedDepths[colorType]?.includes(bitDepth) || bytes[26] !== 0 || bytes[27] !== 0 || interlace > 1) return false;

  const chunks: Uint8Array[] = [];
  let compressedLength = 0;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = uint32(bytes, offset);
    if (ascii(bytes, offset + 4, 4) === "IDAT") {
      const chunk = bytes.subarray(offset + 8, offset + 8 + length);
      chunks.push(chunk);
      compressedLength += chunk.length;
    }
    offset += 12 + length;
  }
  const compressed = new Uint8Array(compressedLength);
  let cursor = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, cursor);
    cursor += chunk.length;
  }
  let decoded: Uint8Array;
  try {
    decoded = inflateSync(compressed, { maxOutputLength: 64 * 1024 * 1024 });
  } catch {
    return false;
  }

  const passSize = (passWidth: number, passHeight: number) =>
    passHeight * (1 + Math.ceil((passWidth * channels * bitDepth) / 8));
  let expectedLength: number;
  if (interlace === 0) {
    expectedLength = passSize(width, height);
  } else {
    const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
    expectedLength = passes.reduce((total, [x, y, dx, dy]) => {
      const passWidth = width <= x ? 0 : Math.ceil((width - x) / dx);
      const passHeight = height <= y ? 0 : Math.ceil((height - y) / dy);
      return total + (passWidth && passHeight ? passSize(passWidth, passHeight) : 0);
    }, 0);
  }
  if (decoded.length !== expectedLength) return false;

  // Every decoded scanline starts with a PNG filter method (0..4). Walking
  // the passes proves that IDAT expands into complete pixel scanlines rather
  // than merely containing an arbitrary valid zlib stream.
  let decodedOffset = 0;
  const inspectPass = (passWidth: number, passHeight: number) => {
    const rowBytes = Math.ceil((passWidth * channels * bitDepth) / 8);
    for (let row = 0; row < passHeight; row++) {
      if (decoded[decodedOffset] > 4) return false;
      decodedOffset += 1 + rowBytes;
    }
    return true;
  };
  if (interlace === 0) return inspectPass(width, height) && decodedOffset === decoded.length;
  const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
  for (const [x, y, dx, dy] of passes) {
    const passWidth = width <= x ? 0 : Math.ceil((width - x) / dx);
    const passHeight = height <= y ? 0 : Math.ceil((height - y) / dy);
    if (passWidth && passHeight && !inspectPass(passWidth, passHeight)) return false;
  }
  return decodedOffset === decoded.length;
}

export function validateUploadedCleaningPhotoBytes(input: { bytes: Uint8Array; mimeType: unknown }): string | null {
  const structuralError = validateCleaningPhotoBytes(input);
  if (structuralError) return structuralError;
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
  if (mimeType === "image/png" && !validateDecodedPng(input.bytes)) {
    return "PNG-фотография содержит повреждённые или недекодируемые пиксельные данные.";
  }
  return null;
}
