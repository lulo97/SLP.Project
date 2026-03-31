import { test, expect } from "@playwright/test";
import { FRONTEND_URL, ADMIN_CREDENTIALS, login } from "../login/utils";

test.describe("Admin Metrics UI", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin and navigate to metrics
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await page.goto(`${FRONTEND_URL}/admin/metrics`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin/metrics`);
  });

  test("UI components are present and structured correctly", async ({
    page,
  }) => {
    // 1. Verify Layout and Container
    await expect(page.getByTestId("metrics-layout")).toBeVisible();
    await expect(page.getByTestId("metrics-container")).toBeVisible();

    // 2. Check Time Range Controls
    await expect(page.getByTestId("metrics-time-range-card")).toBeVisible();

    // Note: If PRESETS labels are "1h", "6h", "24h"
    // The IDs will be preset-1h, preset-6h, etc.
    // If they are "Last 1h", they will be preset-last-1h
    await expect(page.getByTestId("metrics-preset-group")).toBeVisible();
    const refreshBtn = page.getByTestId("metrics-refresh-button");
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toContainText("Refresh");

    // 3. Check Summary Stats Cards
    const statsGrid = page.getByTestId("metrics-stats-grid");
    await expect(statsGrid).toBeVisible();

    // Check specific stat cards (matching the kebab-case logic)
    const expectedStats = [
      "total-requests",
      "total-errors",
      "avg-latency",
      "p95-latency",
    ];
    for (const stat of expectedStats) {
      await expect(page.getByTestId(`stat-card-${stat}`)).toBeVisible();
      await expect(page.getByTestId(`stat-label-${stat}`)).toBeVisible();
      await expect(page.getByTestId(`stat-value-${stat}`)).toBeVisible();
    }

    // 4. Check Chart Cards
    await expect(page.getByTestId("chart-card-requests")).toBeVisible();
    await expect(page.getByTestId("chart-card-errors")).toBeVisible();
    await expect(page.getByTestId("chart-card-latency")).toBeVisible();

    // 5. Verify Page Heading (Testing the MobileLayout prop)
    // MobileLayout usually renders the title prop in an h1 or header
    await expect(page.getByText("API Metrics").first()).toBeVisible();
  });
});
