const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:3006";

test.describe("Source Parser API", () => {
  test.beforeAll(async () => {
    const htmlPath = path.join(__dirname, "sample.html");
    const pdfPath = path.join(__dirname, "sample.pdf");

    if (!fs.existsSync(htmlPath))
      throw new Error(
        "missing sample.html - Please place your Ant wiki HTML here",
      );
    if (!fs.existsSync(pdfPath))
      throw new Error(
        "missing sample.pdf - Please place your Ant wiki PDF here",
      );
  });

  test("POST /parse/url - Should contain Ant keywords", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/parse/url`, {
      data: { url: "https://en.wikipedia.org/wiki/Ant" },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    // Verify parser logic worked
    expect(body.content).toContain("Formicidae");
    expect(body.content).toContain("Hymenoptera");
    expect(body.content.toLowerCase()).toContain("eusocial");
  });

  test("POST /parse/file with Ant PDF", async ({ request }) => {
    const filePath = path.join(__dirname, "sample.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const response = await request.post(`${BASE_URL}/parse/file`, {
      multipart: {
        file: {
          name: "sample.pdf",
          mimeType: "application/pdf",
          buffer: fileBuffer,
        },
        title: "Ant Knowledge",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    // Test that the PDF parser actually extracted the word 'Hymenoptera' or 'Ant'
    expect(body.content).toMatch(/ant/i);
    expect(body.content).toContain("Hymenoptera");
  });

  test("POST /parse/file with Ant HTML", async ({ request }) => {
    const filePath = path.join(__dirname, "sample.html");
    const fileBuffer = fs.readFileSync(filePath);

    const response = await request.post(`${BASE_URL}/parse/file`, {
      multipart: {
        file: {
          name: "sample.html",
          mimeType: "text/html",
          buffer: fileBuffer,
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    // Check for specific classification text from the wiki
    expect(body.content).toContain("Formicidae");
    expect(body.content).toContain("Hymenoptera");
    expect(body.content.toLowerCase()).toContain("eusocial");
  });
});
