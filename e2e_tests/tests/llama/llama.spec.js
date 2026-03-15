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
    sourceId: 1, // dummy source ID
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
    test("should return 200 with explanation (non‑cached)", async ({ request }) => {
      const reqData = generateExplainRequest();
      const res = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res.status()).toBe(200);

      const body = await res.json();
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

      // First request – should call LLM API and store
      const res1 = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res1.status()).toBe(200);
      const body1 = await res1.json();

      // Second request – should return cached response (same text)
      const res2 = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res2.status()).toBe(200);
      const body2 = await res2.json();

      expect(body2.explanation).toEqual(body1.explanation);
    });
  });

  test.describe("POST /llm/grammar-check", () => {
    test("should return 200 with corrected text (non‑cached)", async ({ request }) => {
      const reqData = generateGrammarRequest();
      const res = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("correctedText");
      expect(typeof body.correctedText).toBe("string");
      expect(body.correctedText.length).toBeGreaterThan(0);
    });

    test("should return cached response on second identical request", async ({ request }) => {
      const reqData = {
        text: "He go to school every day.",
      };

      const res1 = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res1.status()).toBe(200);
      const body1 = await res1.json();

      const res2 = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": adminToken },
        data: reqData,
      });
      expect(res2.status()).toBe(200);
      const body2 = await res2.json();

      expect(body2.correctedText).toEqual(body1.correctedText);
    });
  });

  test.describe("Full lifecycle", () => {
    test("should handle both endpoints successfully", async ({ request }) => {
      // Explain
      const explainReq = generateExplainRequest();
      const explainRes = await request.post(`${API_BASE_URL}/llm/explain`, {
        headers: { "X-Session-Token": adminToken },
        data: explainReq,
      });
      expect(explainRes.status()).toBe(200);
      const explainBody = await explainRes.json();
      expect(explainBody.explanation).toBeTruthy();

      // Grammar
      const grammarReq = generateGrammarRequest();
      const grammarRes = await request.post(`${API_BASE_URL}/llm/grammar-check`, {
        headers: { "X-Session-Token": adminToken },
        data: grammarReq,
      });
      expect(grammarRes.status()).toBe(200);
      const grammarBody = await grammarRes.json();
      expect(grammarBody.correctedText).toBeTruthy();
    });
  });
});