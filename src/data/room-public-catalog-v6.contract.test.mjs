import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const roomDetails = read("./room-details.ts");
const rooms = read("./rooms.ts");
const roomsPage = read("../app/rooms/page.tsx");
const gardenPage = read("../app/garden/page.tsx");
const home = read("./home.ts");
const aiKnowledge = read("../lib/ai/knowledge-base.ts");

test("room and Garden public surfaces do not use Unsplash room imagery", () => {
  assert.doesNotMatch(roomDetails, /images\.unsplash\.com/);
  assert.doesNotMatch(rooms, /images\.unsplash\.com/);
  assert.doesNotMatch(roomsPage, /images\.unsplash\.com/);
  assert.doesNotMatch(gardenPage, /images\.unsplash\.com/);
  assert.match(home, /title:\s*"Номера и коттеджи"[\s\S]*?img:\s*"\/images\/rooms\/photo-pending\.svg"/);
  assert.match(home, /title:\s*"Garden Rooms 2026"[\s\S]*?img:\s*"\/images\/rooms\/photo-pending\.svg"/);
});

test("public catalog contains the verified Room Master V6 structure", () => {
  assert.match(roomDetails, /24 номера: 55 официальных мест и максимум 78/);
  assert.match(roomDetails, /36 двухместных стандартных номеров/);
  assert.match(roomDetails, /20 двухместных люксов/);
  assert.match(roomDetails, /14 двухместных стандартных номеров/);
  assert.match(roomDetails, /ровно 2 номера категории полулюкс/);
  assert.match(roomDetails, /14 двухместных люксов в корпусе №3/);
  assert.match(roomDetails, /10 семейных номеров по 4 официальных места/);
  assert.match(roomDetails, /32 двухместных номера/);
  assert.match(roomDetails, /17 объектов: 3 кирпичных коттеджа и 14 деревянных/);
  assert.doesNotMatch(roomDetails, /11 коттедж/);
  assert.doesNotMatch(roomDetails, /16 двухместных полулюкс/);
});

test("AI room knowledge carries the canonical totals and price safety gaps", () => {
  assert.match(aiKnowledge, /169 подтверждённых единиц, 407 официальных мест, максимум 484/);
  assert.match(aiKnowledge, /14 стандартных номеров корпуса №3/);
  assert.match(aiKnowledge, /номера 301 корпуса №3/);
  assert.match(aiKnowledge, /Парковка — 100 сом/);
});
