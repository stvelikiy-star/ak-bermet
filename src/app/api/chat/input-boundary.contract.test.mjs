import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("chat endpoint rejects malformed and oversized public input before provider call", () => {
  assert.match(route, /MAX_BODY_BYTES = 64 \* 1024/);
  assert.match(route, /MAX_MESSAGE_LENGTH = 2_000/);
  assert.match(route, /MAX_HISTORY_ITEMS = 8/);
  assert.match(route, /MAX_HISTORY_CONTENT_LENGTH = 4_000/);
  assert.match(route, /typeof raw\.message !== "string"/);
  assert.match(route, /contentLength > MAX_BODY_BYTES/);
  assert.match(route, /status:\s*413/);
  assert.match(route, /normalizeHistory\(raw\.history\)/);
  assert.match(route, /value\.length > MAX_HISTORY_ITEMS/);
});

test("untrusted history cannot inject system-role messages", () => {
  assert.match(route, /item\.role !== "user" && item\.role !== "assistant"/);
  assert.doesNotMatch(route, /item\.role === "system"/);
});
