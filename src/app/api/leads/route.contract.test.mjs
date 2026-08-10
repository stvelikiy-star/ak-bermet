import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./route.ts", import.meta.url),
  "utf8",
);

test("lead API never reports success when durable persistence is unavailable", () => {
  assert.match(source, /if \(!isGoogleSheetsEnabled\(\)\)/);
  assert.match(source, /status:\s*503/);
  assert.doesNotMatch(source, /saved in mock mode/i);
  assert.doesNotMatch(source, /\[LEAD\]\s*mock/i);
});

test("lead API reports success only after the durable append path", () => {
  const appendIndex = source.indexOf("await appendLeadToSheet(lead)");
  const successIndex = source.lastIndexOf("NextResponse.json({ ok: true, leadId: lead.id })");

  assert.notEqual(appendIndex, -1);
  assert.notEqual(successIndex, -1);
  assert.ok(successIndex > appendIndex);
});
