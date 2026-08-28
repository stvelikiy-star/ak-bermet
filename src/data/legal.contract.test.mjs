import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const legal = await readFile(new URL("./legal.ts", import.meta.url), "utf8");
const knowledge = await readFile(
  new URL("../lib/ai/knowledge-base.ts", import.meta.url),
  "utf8"
);
const settings = await readFile(
  new URL("../app/manager/settings/page.tsx", import.meta.url),
  "utf8"
);

const declaredScope = `${legal}
${knowledge}
${settings}`;

const forbiddenCancellationText = [
  "За 14 и более дней до заезда",
  "За 7–14 дней до заезда",
  "Возврат 50% предоплаты",
  "Удерживается стоимость одних суток",
  "14+ дн. — 100%",
  "7–14 дн. — 50%",
];

test("declared scope contains no invented legacy cancellation tiers", () => {
  for (const text of forbiddenCancellationText) {
    assert.equal(declaredScope.includes(text), false, `legacy rule remains: ${text}`);
  }
});

test("LEGAL carries only the owner-approved cancellation meaning", () => {
  assert.match(legal, /term: "За 7 и более дней до заезда"/);
  assert.match(legal, /result: "Возврат предоплаты возможен"/);
  assert.match(
    legal,
    /note: "с учётом применимой комиссии и процедуры через администратора"/
  );
  assert.match(legal, /term: "Менее чем за 7 дней до заезда"/);
  assert.match(legal, /result: "Предоплата не возвращается"/);
  assert.match(legal, /term: "Неявка \(no-show\)"/);
  assert.match(legal, /note: "неявка считается невозвратной"/);
});

test("approved prepayment and check-in/out rules remain unchanged", () => {
  assert.match(
    legal,
    /prepayment: "20% от стоимости бронирования, если иное не согласовано с администрацией"/
  );
  assert.match(legal, /checkIn: "с 13:00"/);
  assert.match(legal, /checkOut: "до 11:00"/);
});

test("AI knowledge consumes LEGAL instead of duplicating cancellation text", () => {
  assert.match(knowledge, /import \{ LEGAL \} from "@\/data\/legal"/);
  assert.match(knowledge, /cancellation: LEGAL\.refundTiers\.map\(/);
  assert.doesNotMatch(knowledge, /За 14 и более дней|За 7–14 дней|стоимость одних суток/);
});

test("manager settings consumes the same canonical LEGAL tiers", () => {
  assert.match(settings, /import \{ LEGAL \} from "@\/data\/legal"/);
  assert.match(settings, /value=\{LEGAL\.refundTiers/);
  assert.match(settings, /\.map\(\(tier\) => `\$\{tier\.term\}: \$\{tier\.result\}`\)/);
  assert.doesNotMatch(settings, /14\+ дн|7–14 дн|менее 7 дн\. — сутки/);
});
