
import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

test.describe("Source – text selection and AI explanation", () => {
  test("should create a note, request an explanation, and delete the source", async ({
    page,
  }) => {
    // 1. Log in and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list-add-text-btn")).toBeVisible();

    // 2. Create a new text source (note)
    await page.getByTestId("source-list-add-text-btn").click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);
    await expect(page.getByTestId("source-text-create-card")).toBeVisible();

    const uniqueTitle = `Playwright Explanation Test ${Date.now()}`;
    const sampleContent = `First paragraph with some interesting text. This is the text we will select later.
      Second paragraph. It contains different information.`;
      
    await page.getByTestId("source-text-create-title-input").fill(uniqueTitle);
    await page.getByTestId("source-text-create-content-input").fill(sampleContent);
    await page.getByTestId("source-text-create-submit-btn").click();

    // 3. Wait for the source detail page to load and capture the source ID
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 4. Wait for the article content to be visible
    await expect(page.getByTestId("source-detail-article")).toBeVisible();
    await expect(page.getByTestId("source-detail-content-plain")).toBeVisible();

    // 5. Select only the first word ("First") programmatically
    const firstParagraph = page
      .locator('[data-testid="source-detail-content-plain"] p')
      .first();

    await firstParagraph.evaluate((el) => {
      const textNode = el.firstChild;
      if (!textNode || !textNode.textContent) return;

      const text = textNode.textContent;
      // Find the first space to isolate the first word
      const firstSpaceIndex = text.indexOf(" ");
      const endOffset = firstSpaceIndex !== -1 ? firstSpaceIndex : text.length;

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, endOffset);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Trigger mouseup so SelectionBubble.vue calculates position and shows up
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    // 6. Wait for the selection bubble to appear and click the “Explain” button
    await expect(page.getByTestId("selection-bubble")).toBeVisible();
    await page.getByTestId("selection-bubble-explain-btn").click();

    // 7. The explanation panel should open and show the selected word ("First")
    await expect(page.getByTestId("explanation-panel")).toBeVisible();
    await expect(
      page.getByTestId("explanation-panel-preview-text"),
    ).toContainText(/First/i); // Updated to match single word selection

    // 8. Click the “Explain with AI” button inside the panel
    await page.getByTestId("explanation-panel-explain-btn").click();

    // 9. Wait for the explanation to appear
    const explanationList = page.getByTestId("explanation-panel-list");
    await expect(explanationList).toBeVisible();

    const firstCard = explanationList
      .locator('[data-testid^="explanation-panel-card-"]')
      .first();
    const cardContent = firstCard.locator(
      '[data-testid^="explanation-panel-card-content-"]',
    );
    
    // LLM may take time, especially on first boot/inference
    await expect(cardContent).not.toBeEmpty({ timeout: 60000 });

    const contentText = await cardContent.textContent();
    expect(contentText?.trim().length).toBeGreaterThan(0);

    // 10. Go back to the sources list
    await page.getByTestId("source-detail-back-btn").click();
    await page.waitForURL(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list")).toBeVisible();

    // 11. Locate the source item by its ID and delete it
    const sourceItem = page.locator(
      `[data-testid="source-list-item-${sourceId}"]`,
    );
    await expect(sourceItem).toBeVisible();
    await sourceItem
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();

    // 12. Confirm deletion
    await page.getByRole("button", { name: "Yes" }).click();

    // 13. Wait for the item to disappear
    await expect(sourceItem).not.toBeVisible();

    // Optional: check success notification
    const successNotif = page.getByText("Source deleted");
    await expect(successNotif).toBeVisible();
  });
});