import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const providerUrl = new URL("./index.ts", import.meta.url);
const routeUrl = new URL("../../../app/api/chat/route.ts", import.meta.url);

const providerSource = await readFile(providerUrl, "utf8");
const routeSource = await readFile(routeUrl, "utf8");

let moduleSerial = 0;

function restoreEnvironment(snapshot) {
  for (const name of ["NODE_ENV", "AI_PROVIDER", "AI_ENABLE_REAL_CALLS", "OPENAI_API_KEY"]) {
    if (snapshot[name] === undefined) delete process.env[name];
    else process.env[name] = snapshot[name];
  }
}

async function loadProvider({
  nodeEnv,
  provider,
  realCalls,
  apiKey,
  openaiImpl = async () => ({ message: "real" }),
  mockImpl = async () => ({ message: "mock" }),
} = {}) {
  const snapshot = {
    NODE_ENV: process.env.NODE_ENV,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_ENABLE_REAL_CALLS: process.env.AI_ENABLE_REAL_CALLS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (provider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = provider;
  if (realCalls === undefined) delete process.env.AI_ENABLE_REAL_CALLS;
  else process.env.AI_ENABLE_REAL_CALLS = realCalls;
  if (apiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = apiKey;

  let mockCalls = 0;
  let openaiCalls = 0;
  globalThis.__providerModeMock = async (...args) => {
    mockCalls += 1;
    return mockImpl(...args);
  };
  globalThis.__providerModeOpenAI = async (...args) => {
    openaiCalls += 1;
    return openaiImpl(...args);
  };

  const executable = providerSource
    .replace(/^import type .*?;\n/m, "")
    .replace(
      /^import \{ mockProvider \} from .*?;\n/m,
      "const mockProvider = globalThis.__providerModeMock;\n"
    )
    .replace(
      /^import \{ openaiProvider \} from .*?;\n/m,
      "const openaiProvider = globalThis.__providerModeOpenAI;\n"
    )
    .replace(
      'export function getAIProviderName(): "mock" | "openai"',
      "export function getAIProviderName()"
    )
    .replace(
      "export function isRealAIEnabled(): boolean",
      "export function isRealAIEnabled()"
    )
    .replace(
      "  input: AIProviderInput\n): Promise<ChatResponse>",
      "  input\n)"
    );

  const encoded = Buffer.from(executable, "utf8").toString("base64");
  const module = await import(
    `data:text/javascript;base64,${encoded}#${moduleSerial++}`
  );

  return {
    module,
    calls: () => ({ mock: mockCalls, openai: openaiCalls }),
    restore() {
      restoreEnvironment(snapshot);
      delete globalThis.__providerModeMock;
      delete globalThis.__providerModeOpenAI;
    },
  };
}

async function rejectsUnavailable(promise, ErrorType) {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof ErrorType, true);
    assert.equal(error.name, "AIProviderUnavailableError");
    assert.equal(error.message, "AI provider is unavailable");
    return true;
  });
}

test("explicit mock mode remains the only path to mock responses", async () => {
  const ctx = await loadProvider({ nodeEnv: "development", provider: "mock" });
  try {
    assert.equal(ctx.module.getAIProviderName(), "mock");
  } finally {
    ctx.restore();
  }
});

test("misconfigured real mode fails closed", async () => {
  const ctx = await loadProvider({
    nodeEnv: "production",
    provider: "openai",
    realCalls: "false",
  });
  try {
    await rejectsUnavailable(
      ctx.module.generateAIResponse({ message: "x" }),
      ctx.module.AIProviderUnavailableError
    );
    assert.deepEqual(ctx.calls(), { mock: 0, openai: 0 });
  } finally {
    ctx.restore();
  }
});

test("an unset provider never implicitly selects mock", async () => {
  const ctx = await loadProvider({ nodeEnv: "development" });
  try {
    assert.equal(ctx.module.getAIProviderName(), "openai");
    await rejectsUnavailable(
      ctx.module.generateAIResponse({ message: "x" }),
      ctx.module.AIProviderUnavailableError
    );
    assert.equal(ctx.calls().mock, 0);
  } finally {
    ctx.restore();
  }
});

test("explicit mock selection still returns mock content", async () => {
  const ctx = await loadProvider({ nodeEnv: "development", provider: "mock" });
  try {
    assert.deepEqual(
      await ctx.module.generateAIResponse({ message: "x" }),
      { message: "mock" }
    );
    assert.deepEqual(ctx.calls(), { mock: 1, openai: 0 });
  } finally {
    ctx.restore();
  }
});

test("explicit mock selection remains available in local development", async () => {
  const ctx = await loadProvider({ nodeEnv: "test", provider: "mock" });
  try {
    assert.equal(ctx.module.getAIProviderName(), "mock");
    assert.deepEqual(
      await ctx.module.generateAIResponse({ message: "x" }),
      { message: "mock" }
    );
  } finally {
    ctx.restore();
  }
});

test("production never serves mock content", async () => {
  const ctx = await loadProvider({ nodeEnv: "production", provider: "mock" });
  try {
    assert.equal(ctx.module.getAIProviderName(), "openai");
    await rejectsUnavailable(
      ctx.module.generateAIResponse({ message: "x" }),
      ctx.module.AIProviderUnavailableError
    );
    assert.equal(ctx.calls().mock, 0);
  } finally {
    ctx.restore();
  }
});

test("mock selection fails closed when the runtime environment is unset", async () => {
  const ctx = await loadProvider({ provider: "mock" });
  try {
    assert.equal(ctx.module.getAIProviderName(), "openai");
    await rejectsUnavailable(
      ctx.module.generateAIResponse({ message: "x" }),
      ctx.module.AIProviderUnavailableError
    );
    assert.equal(ctx.calls().mock, 0);
  } finally {
    ctx.restore();
  }
});

test("configured real mode returns only the real provider response", async () => {
  const ctx = await loadProvider({
    nodeEnv: "production",
    provider: "openai",
    realCalls: "true",
    apiKey: "contract-test-key",
    openaiImpl: async () => ({ message: "real-only" }),
  });
  try {
    assert.equal(ctx.module.isRealAIEnabled(), true);
    assert.deepEqual(
      await ctx.module.generateAIResponse({ message: "x" }),
      { message: "real-only" }
    );
    assert.deepEqual(ctx.calls(), { mock: 0, openai: 1 });
  } finally {
    ctx.restore();
  }
});

test("real mode configuration and provider failures never call mock", async () => {
  const ctx = await loadProvider({
    nodeEnv: "production",
    provider: "openai",
    realCalls: "true",
    apiKey: "contract-test-key",
    openaiImpl: async () => {
      throw new Error("provider-internal-secret");
    },
  });
  try {
    await rejectsUnavailable(
      ctx.module.generateAIResponse({ message: "x" }),
      ctx.module.AIProviderUnavailableError
    );
    assert.deepEqual(ctx.calls(), { mock: 0, openai: 1 });
  } finally {
    ctx.restore();
  }
});

test("chat route returns a sanitized handoff when AI is unavailable", () => {
  assert.match(routeSource, /catch\s*\{/);
  assert.doesNotMatch(routeSource, /catch\s*\(\s*error\s*\)/);
  assert.match(
    routeSource,
    /console\.error\("\[CHAT\] AI response unavailable"\)/
  );
  assert.doesNotMatch(routeSource, /console\.error\([^\n]*error/);
  assert.match(routeSource, /shouldHandoff:\s*true/);
  assert.match(routeSource, /status:\s*503/);
  assert.match(routeSource, /shouldForceHandoff\(message, base\.message\)/);
  assert.doesNotMatch(routeSource, /fallback on mock|fallback в mock/i);
});
