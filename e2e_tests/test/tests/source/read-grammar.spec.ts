
import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

test.describe("Source – text selection and AI grammar check", () => {
  test("should create a note, request a grammar check, and delete the source", async ({
    page,
  }) => {
    // 1. Log in and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list-add-text-btn")).toBeVisible();

    // 2. Create a new text source (note) with a sentence containing a grammar error
    await page.getByTestId("source-list-add-text-btn").click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);
    await expect(page.getByTestId("source-text-create-card")).toBeVisible();

    const uniqueTitle = `Playwright Grammar Test ${Date.now()}`;
    // Deliberate grammar error: "he go" instead of "he goes"
    const sampleContent = `This is a test. He go to school every day. The quick brown fox jumps over the lazy dog.`;
    await page.getByTestId("source-text-create-title-input").fill(uniqueTitle);
    await page
      .getByTestId("source-text-create-content-input")
      .fill(sampleContent);
    await page.getByTestId("source-text-create-submit-btn").click();

    // 3. Wait for the source detail page to load and capture the source ID
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 4. Wait for the article content to be visible
    await expect(page.getByTestId("source-detail-article")).toBeVisible();
    await expect(page.getByTestId("source-detail-content-plain")).toBeVisible();

    // 5. Select a sentence that contains the grammar error
    const firstParagraph = page
      .locator('[data-testid="source-detail-content-plain"] p')
      .first();

    await firstParagraph.evaluate((el) => {
      const textNode = el.firstChild;
      if (!textNode || !textNode.textContent) return;

      const text = textNode.textContent;
      // Locate the sentence "He go to school every day."
      const startIdx = text.indexOf("He go");
      const endIdx = startIdx + "He go to school every day.".length;
      if (startIdx === -1) return;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Trigger mouseup so the selection bubble appears
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    // 6. Wait for the selection bubble to appear and click the “Grammar” button
    await expect(page.getByTestId("selection-bubble")).toBeVisible();
    await page.getByTestId("selection-bubble-grammar-btn").click();

    // 7. Wait for the grammar check modal to appear
    // Ant Design modal uses role="dialog"
    const modal = page.getByRole('dialog');

    await expect(modal).toBeVisible({ timeout: 180000 });

    expect(modal).toBeTruthy();

    // 8. Verify that the modal contains both original and corrected text
    const modalText = await page.getByRole('dialog').innerText();
    expect(modalText).toContain("Grammar Check Result");
    expect(modalText).toContain("Input text:");
    expect(modalText).toContain("Corrected text:");
    // The corrected text should contain a correction (e.g., "goes")
    //expect(modalText).toContain("goes");

    // 9. Close the modal by clicking the "OK" button
    await page.getByRole("button", { name: "Close" }).first().click();

    // 10. Go back to the sources list
    await page.getByTestId("source-detail-back-btn").click();
    await page.waitForURL(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list")).toBeVisible();

    // 11. Locate the source item by its ID and delete it
    const sourceItem = page.locator(
      `[data-testid="source-list-item-${sourceId}"]`
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