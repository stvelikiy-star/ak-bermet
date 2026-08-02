import test from "node:test";
import assert from "node:assert/strict";
import {
  canPerformHousekeepingAction,
  getHousekeepingPriority,
  isValidProblemNote,
  validateCleaningPhoto,
  validateCleaningPhotoBytes,
  validateCleaningPhotoFile,
  validateHousekeepingAction,
  validateRequiredCleaningPhotos,
} from "./housekeeping-rules.ts";

test("housekeeping transitions allow only the prepared RPC state graph", () => {
  assert.equal(canPerformHousekeepingAction("pending", "accept"), true);
  assert.equal(canPerformHousekeepingAction("accepted", "start"), true);
  assert.equal(canPerformHousekeepingAction("in_progress", "complete"), true);

  assert.equal(canPerformHousekeepingAction("accepted", "accept"), false);
  assert.equal(canPerformHousekeepingAction("pending", "start"), false);
  assert.equal(canPerformHousekeepingAction("done", "complete"), false);
  assert.match(
    validateHousekeepingAction("problem_reported", "start") ?? "",
    /недоступно/
  );
});

test("uploaded cleaning photo must have supported image metadata and nonzero bounded size", () => {
  assert.equal(validateCleaningPhotoFile({ mimeType: "image/jpeg", size: 1024 }), null);
  assert.equal(validateCleaningPhotoFile({ mimeType: "IMAGE/WEBP", size: "2048" }), null);
  assert.match(validateCleaningPhotoFile({ mimeType: "application/pdf", size: 1024 }) ?? "", /только фотографии/);
  assert.match(validateCleaningPhotoFile({ mimeType: "image/png", size: 0 }) ?? "", /пуста/);
  assert.match(validateCleaningPhotoFile({ mimeType: "image/png", size: 10 * 1024 * 1024 + 1 }) ?? "", /10 МБ/);
});

test("uploaded cleaning photo bytes must contain the declared image format", () => {
  const jpegWithoutCodingTables = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x01, 0xff, 0xd9,
  ]);
  const fakeJpeg = new Uint8Array([0xff, 0xd8, ...new TextEncoder().encode("not an image"), 0xff, 0xd9]);
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
  const corruptPng = png.slice();
  corruptPng[32] ^= 1;

  assert.match(validateCleaningPhotoBytes({ bytes: jpegWithoutCodingTables, mimeType: "image/jpeg" }) ?? "", /не является/);
  assert.equal(validateCleaningPhotoBytes({ bytes: png, mimeType: "image/png" }), null);
  assert.match(validateCleaningPhotoBytes({ bytes: corruptPng, mimeType: "image/png" }) ?? "", /не является/);
  assert.match(validateCleaningPhotoBytes({ bytes: fakeJpeg, mimeType: "image/jpeg" }) ?? "", /не является/);
  assert.match(validateCleaningPhotoBytes({ bytes: new TextEncoder().encode("not an image"), mimeType: "image/jpeg" }) ?? "", /не является/);
  assert.match(validateCleaningPhotoBytes({ bytes: png, mimeType: "image/jpeg" }) ?? "", /не соответствует/);
});

test("photo policy requires before evidence for problems and both phases for completion", () => {
  assert.match(validateRequiredCleaningPhotos({ action: "report_problem", phases: [] }) ?? "", /до уборки/);
  assert.equal(validateRequiredCleaningPhotos({ action: "report_problem", phases: ["before"] }), null);
  assert.match(validateRequiredCleaningPhotos({ action: "complete", phases: ["after"] }) ?? "", /до уборки/);
  assert.match(validateRequiredCleaningPhotos({ action: "complete", phases: ["before"] }) ?? "", /после уборки/);
  assert.equal(validateRequiredCleaningPhotos({ action: "complete", phases: ["before", "after"] }), null);
});

test("cleaning photos accept safe storage paths only in the matching active phase", () => {
  assert.equal(validateCleaningPhoto({ status: "accepted", phase: "before", storagePath: "cleaning/task/before.jpg" }), null);
  assert.equal(validateCleaningPhoto({ status: "in_progress", phase: "after", storagePath: "cleaning/task/after.jpg" }), null);
  assert.equal(validateCleaningPhoto({ status: "problem_reported", phase: "after", storagePath: "cleaning/task/after.jpg" }), null);
  assert.match(validateCleaningPhoto({ status: "accepted", phase: "after", storagePath: "cleaning/task/after.jpg" }) ?? "", /во время уборки/);
  assert.match(validateCleaningPhoto({ status: "done", phase: "after", storagePath: "cleaning/task/after.jpg" }) ?? "", /завершённой/);
  assert.match(validateCleaningPhoto({ status: "in_progress", phase: "after", storagePath: "https://example.test/a.jpg" }) ?? "", /корректный путь/);
});

test("problem reporting is limited to active, owned-workflow statuses", () => {
  assert.equal(canPerformHousekeepingAction("pending", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("accepted", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("in_progress", "report_problem"), true);
  assert.equal(canPerformHousekeepingAction("problem_reported", "report_problem"), false);
  assert.equal(canPerformHousekeepingAction("done", "report_problem"), false);
  assert.equal(canPerformHousekeepingAction("cancelled", "report_problem"), false);
});

test("due-date priority is deterministic for a supplied clock", () => {
  const now = Date.parse("2026-07-27T06:00:00.000Z");
  assert.equal(getHousekeepingPriority(null, now), "low");
  assert.equal(
    getHousekeepingPriority("2026-07-27T05:59:59.000Z", now),
    "overdue"
  );
  assert.equal(
    getHousekeepingPriority("2026-07-27T07:30:00.000Z", now),
    "high"
  );
  assert.equal(
    getHousekeepingPriority("2026-07-28T06:00:00.000Z", now),
    "normal"
  );
});

test("problem notes reject blank, too-short, and oversized values", () => {
  assert.equal(isValidProblemNote("  "), false);
  assert.equal(isValidProblemNote("ab"), false);
  assert.equal(isValidProblemNote("Течёт кран"), true);
  assert.equal(isValidProblemNote("x".repeat(1001)), false);
});
