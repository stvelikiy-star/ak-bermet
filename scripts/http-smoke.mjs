import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.AK_BERMET_SMOKE_PORT || 3127);
const baseUrl = `http://127.0.0.1:${port}`;
const runtimeRoot = mkdtempSync(join(tmpdir(), "ak-bermet-http-smoke-"));
const runtimeDir = join(runtimeRoot, "app");

// Reproduce the Docker runner layout exactly: standalone server + public +
// .next/static. Testing the packaged artifact is stricter than `next start`.
cpSync(".next/standalone", runtimeDir, { recursive: true });
cpSync("public", join(runtimeDir, "public"), { recursive: true });
mkdirSync(join(runtimeDir, ".next"), { recursive: true });
cpSync(".next/static", join(runtimeDir, ".next/static"), { recursive: true });

const serverEnv = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(port),
  HOSTNAME: "127.0.0.1",
  NEXT_TELEMETRY_DISABLED: "1",
  GOOGLE_SHEETS_ENABLED: "false",
  AI_ENABLE_REAL_CALLS: "false",
};

// The CI smoke intentionally runs without Supabase credentials. Public pages
// must render from verified static fallbacks, while staff areas must fail
// closed and redirect to /staff/login.
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  delete serverEnv[key];
}

const server = spawn(process.execPath, ["server.js"], {
  cwd: runtimeDir,
  env: serverEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
for (const stream of [server.stdout, server.stderr]) {
  stream?.on("data", (chunk) => {
    const text = chunk.toString();
    serverOutput += text;
    process.stdout.write(text);
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Standalone server exited before smoke tests (code ${server.exitCode})\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // Server is still starting.
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${baseUrl}\n${serverOutput}`);
}

async function get(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
}

async function expectHtml200(path) {
  const response = await get(path);
  const body = await response.text();
  assert.equal(response.status, 200, `${path} must return HTTP 200`);
  assert.match(response.headers.get("content-type") || "", /text\/html/i, `${path} must return HTML`);
  assert.ok(body.length > 500, `${path} returned unexpectedly small HTML`);
  assert.doesNotMatch(body, /Internal Server Error|Application error: a server-side exception/i, `${path} contains an error page`);
  return body;
}

async function expectStaffRedirect(path) {
  const response = await get(path);
  assert.ok([307, 308].includes(response.status), `${path} must fail closed with a redirect, got ${response.status}`);
  const location = response.headers.get("location") || "";
  assert.match(location, /\/staff\/login\?from=/, `${path} must redirect to staff login`);
}

try {
  await waitForServer();

  const publicPages = [
    "/",
    "/rooms",
    "/rooms/standard-building-1",
    "/garden",
    "/hot-springs",
    "/spa",
    "/events",
    "/food",
    "/promos",
    "/contacts",
    "/faq",
    "/legal/privacy",
    "/legal/public-offer",
    "/legal/refund",
    "/legal/terms",
    "/staff/login",
    "/staff/unauthorized",
  ];

  for (const path of publicPages) await expectHtml200(path);

  const promosHtml = await expectHtml200("/promos");
  assert.doesNotMatch(promosHtml, />\s*3\+1\s*</i, "Expired June 3+1 promo must not be published");
  assert.doesNotMatch(promosHtml, /8\s*(?:–|-)\s*30\s+июня/i, "Expired June promo dates must not be published");

  for (const path of [
    "/manager",
    "/manager/leads",
    "/manager/bookings",
    "/manager/payments",
    "/manager/content",
    "/housekeeping",
    "/technician",
  ]) {
    await expectStaffRedirect(path);
  }

  const managerStatus = await get("/api/manager/status");
  assert.equal(managerStatus.status, 403, "Unauthenticated manager API must return 403");

  const chatStatus = await get("/api/chat/status");
  assert.equal(chatStatus.status, 200, "Chat status endpoint must be available");
  const chatStatusJson = await chatStatus.json();
  // Production is intentionally fail-closed: a build-time/mock test setting may
  // never make the deployed artifact advertise or serve mock AI.
  assert.equal(chatStatusJson.provider, "openai", "Production artifact must never advertise mock AI");
  assert.equal(chatStatusJson.realCallsEnabled, false, "CI smoke must never enable real AI calls");

  const malformedLead = await get("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: 123, phone: { bad: true } }),
  });
  assert.equal(malformedLead.status, 422, "Malformed lead input must be rejected before any durable write");

  const leadsGet = await get("/api/leads");
  assert.equal(leadsGet.status, 405, "Public lead endpoint must reject GET");

  const robots = await get("/robots.txt");
  assert.equal(robots.status, 200, "robots.txt must exist");
  assert.match(await robots.text(), /User-Agent:/i, "robots.txt must contain crawler rules");

  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200, "sitemap.xml must exist");
  assert.match(await sitemap.text(), /<urlset/i, "sitemap.xml must be valid XML sitemap output");

  const favicon = await fetch(`${baseUrl}/favicon.ico`, { redirect: "follow" });
  assert.equal(favicon.status, 200, "favicon compatibility URL must resolve");

  console.log(`HTTP_SMOKE_PASS public=${publicPages.length} protected=7 api=4 seo=2 artifact=standalone`);
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      sleep(2_000),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  rmSync(runtimeRoot, { recursive: true, force: true });
}
