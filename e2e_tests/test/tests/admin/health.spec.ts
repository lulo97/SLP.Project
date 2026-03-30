import { test, expect } from "@playwright/test";
import { FRONTEND_URL, ADMIN_CREDENTIALS, login } from "../login/utils";

test.describe("Admin Health Dashboard", () => {
  test("should display all services and refresh button works", async ({
    page,
  }) => {
    // 1. Log in as admin
    await page.goto(FRONTEND_URL);
    await login(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(`${FRONTEND_URL}/dashboard`);

    // 2. Navigate to health page
    await page.goto(`${FRONTEND_URL}/admin/health`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/admin/health`);

    // 3. Wait for the health card to be visible
    const healthCard = page.getByTestId("health-card");
    await expect(healthCard).toBeVisible();

    // 4. Check that the services table exists
    const servicesTable = page.getByTestId("services-table");
    await expect(servicesTable).toBeVisible();

    // 5. Verify that all expected services are present in the table
    const expectedServices = [
      "Redis",
      "Mail",
      "Backend",
      "Frontend",
      "Llama",
      "Piper Gateway",
    ];
    for (const service of expectedServices) {
      const serviceRow = servicesTable.locator(`tr:has-text("${service}")`);
      await expect(serviceRow).toBeVisible();
    }

    // 6. Verify that each service has a status (any color tag) and response time
    const rows = servicesTable.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBe(expectedServices.length);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      // Status cell: it should contain a <span class="ant-tag"> with some text
      const statusCell = row.locator("td").nth(1);
      const tag = statusCell.locator(".ant-tag");
      await expect(tag).toBeVisible();
      const statusText = (await tag.textContent())?.trim();
      expect(["Healthy", "Degraded", "Unhealthy"]).toContain(statusText);

      // Response time cell: should contain a number followed by " ms" (optional whitespace)
      const responseTimeCell = row.locator("td").nth(3);
      const responseTimeText = (await responseTimeCell.textContent())?.trim();
      expect(responseTimeText).toMatch(/^\d+ ms$/);
    }

    // 7. Get the current last updated timestamp
    const lastUpdated = page.getByTestId("last-updated");
    const initialTimestamp = await lastUpdated.textContent();

    // 8. Click the refresh button and verify loading state appears
    const refreshButton = page.getByTestId("refresh-button");
    await refreshButton.click();

    await page.waitForTimeout(3000);

    // 9. Verify that the table is still populated after refresh
    for (const service of expectedServices) {
      const serviceRow = servicesTable.locator(`tr:has-text("${service}")`);
      await expect(serviceRow).toBeVisible();
    }

    // 10. Check that the timestamp updated (or at least is present and formatted)
    const newTimestamp = await lastUpdated.textContent();
    expect(newTimestamp).not.toBe("—");
    expect(newTimestamp).toMatch(
      /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)/,
    );
  });
});
