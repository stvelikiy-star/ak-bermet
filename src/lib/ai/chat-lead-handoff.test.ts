import assert from "node:assert/strict";
import test from "node:test";
import { buildAiChatLeadInput, chatTopicToLeadInterest } from "./chat-lead-handoff.ts";

test("chat topics map only to existing CRM lead interests", () => {
  assert.equal(chatTopicToLeadInterest("booking"), "rooms");
  assert.equal(chatTopicToLeadInterest("payment"), "rooms");
  assert.equal(chatTopicToLeadInterest("cancellation"), "rooms");
  assert.equal(chatTopicToLeadInterest("garden"), "garden");
  assert.equal(chatTopicToLeadInterest("hot_springs"), "hot_springs");
  assert.equal(chatTopicToLeadInterest("spa"), "spa");
  assert.equal(chatTopicToLeadInterest("events"), "events");
  assert.equal(chatTopicToLeadInterest("food"), "food");
  assert.equal(chatTopicToLeadInterest("promos"), "promo");
  assert.equal(chatTopicToLeadInterest("legal"), "general");
  assert.equal(chatTopicToLeadInterest(undefined), "general");
});

test("AI handoff builds a durable lead input without booking authority", () => {
  const lead = buildAiChatLeadInput({
    name: "  Айжан  ",
    phone: "  +996 555 123 456  ",
    topic: "booking",
    page: "/rooms/lux",
    lastUserMessage: "Хочу номер на 5–8 сентября для двух взрослых",
  });

  assert.equal(lead.source, "ai_chat");
  assert.equal(lead.interest, "rooms");
  assert.equal(lead.name, "Айжан");
  assert.equal(lead.phone, "+996 555 123 456");
  assert.equal(lead.preferredContact, "whatsapp");
  assert.match(lead.message ?? "", /Передано из AI-чата сайта/);
  assert.match(lead.message ?? "", /Страница: \/rooms\/lux/);
  assert.match(lead.message ?? "", /Последний запрос гостя:/);

  assert.equal(lead.checkIn, undefined);
  assert.equal(lead.checkOut, undefined);
  assert.equal(lead.roomCategory, undefined);
});

test("handoff context is bounded before durable persistence", () => {
  const lead = buildAiChatLeadInput({
    name: "Гость",
    phone: "+996555000000",
    page: `/${"p".repeat(500)}`,
    lastUserMessage: "x".repeat(2000),
  });

  const message = lead.message ?? "";
  assert.ok(message.length < 1100);
  assert.equal((message.match(/x/g) ?? []).length, 800);
});
