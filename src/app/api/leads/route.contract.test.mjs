import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const bridgeSource = readFileSync(
  new URL("../../../lib/marina-smart.ts", import.meta.url),
  "utf8",
);
const persistenceSource = readFileSync(
  new URL("../../../lib/public-lead-persistence.ts", import.meta.url),
  "utf8",
);

test("accommodation requests are durably written to MARINA SMART before success", () => {
  assert.match(routeSource, /isAccommodationRequest/);
  assert.match(routeSource, /createMarinaBookingRequest\(validated\)/);
  assert.match(routeSource, /authority: "marina-smart"/);
  assert.match(routeSource, /isReservation: requestItem\.is_reservation/);
  assert.match(bridgeSource, /\/api\/v1\/booking\/requests/);
  assert.match(bridgeSource, /source: "AK_BERMET_WEBSITE"/);
  assert.match(bridgeSource, /room_type_code: input\.roomTypeCode \|\| null/);
});

test("accommodation request failures do not fall back to the website booking database", () => {
  const marinaStart = routeSource.indexOf("if (isAccommodationRequest)");
  const websiteLeadStart = routeSource.indexOf("const lead = buildLead(validated)");
  assert.ok(marinaStart >= 0 && websiteLeadStart > marinaStart);
  const marinaBranch = routeSource.slice(marinaStart, websiteLeadStart);
  assert.doesNotMatch(marinaBranch, /persistPublicLead/);
  assert.match(marinaBranch, /status.*503/s);
});

test("non-accommodation inquiries remain durable in the website CRM", () => {
  assert.match(routeSource, /const lead = buildLead\(validated\)/);
  assert.match(routeSource, /await persistPublicLead\(lead\)/);
  assert.match(routeSource, /authority: "website-crm"/);
  assert.match(persistenceSource, /\.rpc\("fn_public_create_lead"/);
});

test("booking authority errors are sanitized", () => {
  assert.match(routeSource, /console\.error\("\[LEAD\] MARINA SMART booking request failed"\)/);
  assert.doesNotMatch(routeSource, /console\.error\([^\n]*error/);
});
