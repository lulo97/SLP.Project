import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = { username: "admin", password: "123" };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Unique explain request — avoids cache collisions between runs */
function makeExplainRequest() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 99999)}`;
  return {
    sourceId: 1,
    selectedText: `The mitochondria is the powerhouse of the cell ${id}`,
    context: `Biology test ${id}`,
  };
}

/** Unique grammar request */
function makeGrammarRequest() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 99999)}`;
  return { text: `She go to the market every day ${id}.` };
}

/**
 * Poll GET /llm/job/{jobId} until status is Completed or Failed.
 * Returns the raw `result` string from the job log.
 */
async function pollJob(request, jobId, token, { maxMs = 120_000, intervalMs = 2_000 } = {}) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${API_BASE_URL}/llm/job/${jobId}`, {
      headers: { "X-Session-Token": token },
    });
    expect(res.status(), `Job poll returned ${res.status()}`).toBe(200);

    const body = await res.json();

    if (body.status === "Completed") {
      expect(body.result, "Completed job must have a result").toBeTruthy();
      return body.result;               // raw string
    }

    if (body.status === "Failed") {
      throw new Error(`Job ${jobId} failed: ${body.error ?? "(no error message)"}`);
    }

    // Still Pending or Processing — wait and retry
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Job ${jobId} did not complete within ${maxMs}ms`);
}

/**
 * Call an LLM endpoint and always return a normalised `{ result: string }`.
 *
 * • HTTP 200 (sync)  → controller returns { result: "..." }  — return as-is
 * • HTTP 202 (async) → controller returns { jobId, status }  — poll until done,
 *                      then return { result: "..." }
 */
async function callLlm(request, path, data, token) {
  const res = await request.post(`${API_BASE_URL}${path}`, {
    headers: { "X-Session-Token": token },
    data,
  });

  const status = res.status();

  if (status === 200) {
    const body = await res.json();
    // Sync controller response shape: { result: string }
    expect(body, "Sync response must contain 'result'").toHaveProperty("result");
    return { result: body.result };
  }

  if (status === 202) {
    const body = await res.json();
    expect(body, "Async response must contain 'jobId'").toHaveProperty("jobId");
    expect(body.status).toBe("Pending");
    const result = await pollJob(request, body.jobId, token);
    return { result };
  }

  // Unexpected — surface the body for easier debugging
  const text = await res.text();
  throw new Error(`POST ${path} returned HTTP ${status}: ${text}`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
test.setTimeout(300000);

test.describe("LLM API", () => {
  let token;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/auth/login`, {
      data: adminUser,
    });
    expect(res.status(), "Login must succeed").toBe(200);
    const body = await res.json();
    token = body.token;
    expect(token, "Login response must include token").toBeTruthy();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  test.describe("Authentication", () => {
    const protectedEndpoints = [
      { path: "/llm/explain",        data: { sourceId: 1, selectedText: "test" } },
      { path: "/llm/grammar-check",  data: { text: "test" } },
    ];

    for (const ep of protectedEndpoints) {
      test(`POST ${ep.path} — 401 without token`, async ({ request }) => {
        const res = await request.post(`${API_BASE_URL}${ep.path}`, { data: ep.data });
        expect(res.status()).toBe(401);
      });
    }
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  test.describe("Validation", () => {
    test("POST /llm/explain — 400 when selectedText is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": token },
        data: { sourceId: 1 },           // missing selectedText
      });
      expect(res.status()).toBe(400);
    });

    test("POST /llm/explain — 400 when selectedText is empty string", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": token },
        data: { sourceId: 1, selectedText: "" },
      });
      expect(res.status()).toBe(400);
    });

    test("POST /llm/grammar-check — 400 when text is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": token },
        data: {},
      });
      expect(res.status()).toBe(400);
    });

    test("POST /llm/grammar-check — 400 when text is empty string", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": token },
        data: { text: "" },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ── Explain ─────────────────────────────────────────────────────────────────

  test.describe("POST /llm/explain", () => {
    test("returns a non-empty result string", async ({ request }) => {
      const { result } = await callLlm(request, "/llm/explain", makeExplainRequest(), token);
      expect(typeof result).toBe("string");
      expect(result.trim().length).toBeGreaterThan(0);
    });

    test("returns cached result on second identical request", async ({ request }) => {
      // Use a fixed payload so the cache key is deterministic across re-runs.
      // Because the text is stable, the second call must hit the DB cache
      // and return the exact same string regardless of sync/async mode.
      const payload = {
        sourceId: 1,
        selectedText: "What is photosynthesis?",
        context: "Biology",
      };

      const { result: first  } = await callLlm(request, "/llm/explain", payload, token);
      const { result: second } = await callLlm(request, "/llm/explain", payload, token);

      expect(second).toEqual(first);
    });
  });

  // ── Grammar check ────────────────────────────────────────────────────────────

  test.describe("POST /llm/grammar-check", () => {
    test("returns a non-empty result string", async ({ request }) => {
      const { result } = await callLlm(request, "/llm/grammar-check", makeGrammarRequest(), token);
      expect(typeof result).toBe("string");
      expect(result.trim().length).toBeGreaterThan(0);
    });

    test("returns cached result on second identical request", async ({ request }) => {
      const payload = { text: "He go to school every day and learn many thing." };

      const { result: first  } = await callLlm(request, "/llm/grammar-check", payload, token);
      const { result: second } = await callLlm(request, "/llm/grammar-check", payload, token);

      expect(second).toEqual(first);
    });
  });

  // ── Job ownership ────────────────────────────────────────────────────────────
  // Only relevant when Queue:Enabled = true. Skip gracefully if the server
  // responds synchronously (no job to look up).

  test.describe("GET /llm/job/:jobId", () => {
    test("404 for a non-existent jobId", async ({ request }) => {
      const res = await request.get(`${API_BASE_URL}/llm/job/does-not-exist-xyz`, {
        headers: { "X-Session-Token": token },
      });
      expect(res.status()).toBe(404);
    });

    test("job polling returns correct shape when async", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": token },
        data: makeExplainRequest(),           // always unique → never cached
      });

      // Only test the job poll path when the server actually queued the job
      if (res.status() !== 202) {
        test.skip(); // server is in sync mode — nothing to poll
        return;
      }

      const { jobId } = await res.json();
      const result = await pollJob(request, jobId, token);

      expect(typeof result).toBe("string");
      expect(result.trim().length).toBeGreaterThan(0);
    });
  });

  // ── Full lifecycle ───────────────────────────────────────────────────────────

  test("full lifecycle — explain + grammar-check both succeed", async ({ request }) => {
    const [explain, grammar] = await Promise.all([
      callLlm(request, "/llm/explain",       makeExplainRequest(), token),
      callLlm(request, "/llm/grammar-check", makeGrammarRequest(), token),
    ]);

    expect(explain.result.trim().length).toBeGreaterThan(0);
    expect(grammar.result.trim().length).toBeGreaterThan(0);
  });
});