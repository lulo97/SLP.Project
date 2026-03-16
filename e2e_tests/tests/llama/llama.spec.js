import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

// Helper to generate unique request data
function generateExplainRequest() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    sourceId: 1,
    selectedText: `Explain this text ${id}`,
    context: `Optional context ${id}`,
  };
}

function generateGrammarRequest() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    text: `This is a test sentence with a error ${id}.`,
  };
}

// Poll for job completion (max 30 attempts, 2s interval)
async function pollForJobResult(request, jobId, adminToken) {
  const maxAttempts = 30;
  const interval = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusRes = await request.get(`${API_BASE_URL}/llm/job/${jobId}`, {
      headers: { "X-Session-Token": adminToken },
    });
    expect(statusRes.status()).toBe(200);
    const statusBody = await statusRes.json();

    if (statusBody.status === "Completed") {
      return statusBody.result;
    }
    if (statusBody.status === "Failed") {
      throw new Error(`Job ${jobId} failed`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Job ${jobId} timed out after ${maxAttempts * interval}ms`);
}

// Execute an LLM endpoint and return the final result (handles both 200 and 202)
async function executeLlmRequest(request, url, data, adminToken) {
  const res = await request.post(`${API_BASE_URL}${url}`, {
    headers: { "X-Session-Token": adminToken },
    data,
  });

  if (res.status() === 200) {
    return await res.json(); // synchronous response
  } else if (res.status() === 202) {
    const jobBody = await res.json();
    expect(jobBody).toHaveProperty("jobId");
    expect(jobBody).toHaveProperty("status", "Pending");
    const result = await pollForJobResult(request, jobBody.jobId, adminToken);
    // The job result is the final output (explanation or correctedText)
    if (url.includes("explain")) {
      return { explanation: result };
    } else {
      return { correctedText: result };
    }
  } else {
    throw new Error(`Unexpected status: ${res.status()}`);
  }
}

test.describe("LLM API Tests (Explain & Grammar)", () => {
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: adminUser.username,
        password: adminUser.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    adminToken = loginBody.token;
  });

  test.describe("Authentication", () => {
    test("should return 401 for unauthenticated requests", async ({ request }) => {
      const endpoints = [
        { method: "post", url: "/llm/explain", data: { selectedText: "test" } },
        { method: "post", url: "/llm/grammar-check", data: { text: "test" } },
      ];

      for (const ep of endpoints) {
        const res = await request.post(`${API_BASE_URL}${ep.url}`, {
          data: ep.data,
        });
        expect(
          res.status(),
          `Endpoint ${ep.method} ${ep.url} should return 401`,
        ).toBe(401);
      }
    });
  });

  test.describe("Validation", () => {
    test("POST /llm/explain – should return 400 when SelectedText is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": adminToken },
        data: { sourceId: 1 }, // no selectedText
      });
      expect(res.status()).toBe(400);
    });

    test("POST /llm/grammar-check – should return 400 when Text is missing", async ({ request }) => {
      const res = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": adminToken },
        data: {}, // no text
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe("POST /llm/explain", () => {
    test("should return explanation (handles 200 or 202)", async ({ request }) => {
      const reqData = generateExplainRequest();
      const body = await executeLlmRequest(request, "/llm/explain", reqData, adminToken);
      expect(body).toHaveProperty("explanation");
      expect(typeof body.explanation).toBe("string");
      expect(body.explanation.length).toBeGreaterThan(0);
    });

    test("should return cached response on second identical request", async ({ request }) => {
      const reqData = {
        sourceId: 1,
        selectedText: "What is the capital of France?",
        context: "Geography",
      };

      // First request – may be synchronous or queued
      const body1 = await executeLlmRequest(request, "/llm/explain", reqData, adminToken);

      // Second request – should be cached (identical request)
      const body2 = await executeLlmRequest(request, "/llm/explain", reqData, adminToken);

      expect(body2.explanation).toEqual(body1.explanation);
    });
  });

  test.describe("POST /llm/grammar-check", () => {
    test("should return corrected text (handles 200 or 202)", async ({ request }) => {
      const reqData = generateGrammarRequest();
      const body = await executeLlmRequest(request, "/llm/grammar-check", reqData, adminToken);
      expect(body).toHaveProperty("correctedText");
      expect(typeof body.correctedText).toBe("string");
      expect(body.correctedText.length).toBeGreaterThan(0);
    });

    test("should return cached response on second identical request", async ({ request }) => {
      const reqData = {
        text: "He go to school every day.",
      };

      const body1 = await executeLlmRequest(request, "/llm/grammar-check", reqData, adminToken);
      const body2 = await executeLlmRequest(request, "/llm/grammar-check", reqData, adminToken);

      expect(body2.correctedText).toEqual(body1.correctedText);
    });
  });

  test.describe("Full lifecycle", () => {
    test("should handle both endpoints successfully", async ({ request }) => {
      // Explain
      const explainReq = generateExplainRequest();
      const explainBody = await executeLlmRequest(request, "/llm/explain", explainReq, adminToken);
      expect(explainBody.explanation).toBeTruthy();

      // Grammar
      const grammarReq = generateGrammarRequest();
      const grammarBody = await executeLlmRequest(request, "/llm/grammar-check", grammarReq, adminToken);
      expect(grammarBody.correctedText).toBeTruthy();
    });
  });
});