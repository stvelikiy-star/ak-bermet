import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const chat = fs.readFileSync(new URL("./AiChat.tsx", import.meta.url), "utf8");
const handoff = fs.readFileSync(new URL("./AiChatLeadHandoff.tsx", import.meta.url), "utf8");
const mapping = fs.readFileSync(new URL("../lib/ai/chat-lead-handoff.ts", import.meta.url), "utf8");

test("AI chat exposes durable CRM handoff only after assistant handoff", () => {
  assert.match(chat, /shouldHandoff/);
  assert.match(chat, /<AiChatLeadHandoff/);
  assert.match(chat, /lastUserMessage=/);
  assert.match(handoff, /fetch\("\/api\/leads"/);
});

test("AI CRM handoff is a lead write, never a booking authority", () => {
  assert.match(mapping, /source: "ai_chat"/);
  assert.match(mapping, /preferredContact: "whatsapp"/);
  assert.doesNotMatch(handoff, /\/api\/manager\/bookings/);
  assert.doesNotMatch(handoff, /\/api\/availability\/hold/);
  assert.doesNotMatch(mapping, /status:\s*"confirmed"/);
});

test("AI handoff asks for explicit contact details and labels booking as unconfirmed", () => {
  assert.match(handoff, /Ваше имя/);
  assert.match(handoff, /Телефон \/ WhatsApp/);
  assert.match(handoff, /Бронь подтверждает только администратор/);
  assert.match(handoff, /Это ещё не подтверждение брони/);
});
