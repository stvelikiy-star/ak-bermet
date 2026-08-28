from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# 1. Canonical owner-approved cancellation policy lives in LEGAL.
legal = Path("src/data/legal.ts")
old_legal = '''  // Условия возврата (тарифы по срокам отмены)
  refundTiers: [
    {
      term: "За 14 и более дней до заезда",
      result: "Возврат 100% предоплаты",
      note: "за вычетом комиссии банка или платёжной системы",
    },
    {
      term: "За 7–14 дней до заезда",
      result: "Возврат 50% предоплаты",
      note: "за вычетом комиссии банка или платёжной системы",
    },
    {
      term: "Менее чем за 7 дней до заезда",
      result: "Удерживается стоимость одних суток",
      note: "за забронированные номера",
    },
  ],
'''
new_legal = '''  // Owner-approved source of truth for cancellation/refund meaning.
  refundTiers: [
    {
      term: "За 7 и более дней до заезда",
      result: "Возврат предоплаты возможен",
      note: "с учётом применимой комиссии и процедуры через администратора",
    },
    {
      term: "Менее чем за 7 дней до заезда",
      result: "Предоплата не возвращается",
      note: "отмена считается невозвратной",
    },
    {
      term: "Неявка (no-show)",
      result: "Предоплата не возвращается",
      note: "неявка считается невозвратной",
    },
  ],
'''
replace_once(legal, old_legal, new_legal, "legal refund tiers")


# 2. AI knowledge consumes the canonical LEGAL policy instead of duplicating it.
kb = Path("src/lib/ai/knowledge-base.ts")
replace_once(
    kb,
    'import { SITE } from "@/data/site";\n',
    'import { SITE } from "@/data/site";\nimport { LEGAL } from "@/data/legal";\n',
    "knowledge LEGAL import",
)
old_kb = '''  cancellation: [
    "За 14 и более дней до заезда — возврат 100% предоплаты за вычетом комиссии перевода.",
    "За 7–14 дней — возврат 50% предоплаты за вычетом комиссии.",
    "Менее чем за 7 дней — удерживается стоимость одних суток забронированных номеров.",
  ],
'''
new_kb = '''  cancellation: LEGAL.refundTiers.map(
    (tier) => `${tier.term} — ${tier.result}. ${tier.note}.`
  ),
'''
replace_once(kb, old_kb, new_kb, "knowledge cancellation block")


# 3. Manager settings consumes the same canonical LEGAL source.
settings = Path("src/app/manager/settings/page.tsx")
replace_once(
    settings,
    'import { SITE } from "@/data/site";\n',
    'import { SITE } from "@/data/site";\nimport { LEGAL } from "@/data/legal";\n',
    "manager LEGAL import",
)
old_settings = '''            <Row
              label="Отмена"
              value="14+ дн. — 100%, 7–14 дн. — 50%, менее 7 дн. — сутки"
            />
'''
new_settings = '''            <Row
              label="Отмена"
              value={LEGAL.refundTiers
                .map((tier) => `${tier.term}: ${tier.result}`)
                .join(" · ")}
            />
'''
replace_once(settings, old_settings, new_settings, "manager cancellation row")


# 4. Contract locks the declared scope and approved meaning.
Path("src/data/legal.contract.test.mjs").write_text(
    '''import assert from "node:assert/strict";
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

const declaredScope = `${legal}\n${knowledge}\n${settings}`;

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
''',
    encoding="utf-8",
)
