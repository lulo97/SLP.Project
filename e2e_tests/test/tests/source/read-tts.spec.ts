// e2e_tests/test/tests/source/read-listen.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin, FRONTEND_URL } from "../note/noteHelper";

test.describe("Source – text selection and TTS listen", () => {
  test("should create a note, select text, click Listen, and verify TTS player appears", async ({
    page,
  }) => {
    // 1. Log in and go to the sources list
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list-add-text-btn")).toBeVisible();

    // 2. Create a new text source (note)
    await page.getByTestId("source-list-add-text-btn").click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/source/new-text`);
    await expect(page.getByTestId("source-note-create-card")).toBeVisible();

    const uniqueTitle = `Playwright Listen Test ${Date.now()}`;
    // Short enough text that it won't be truncated (max 48 chars)
    const selectedText = "This sentence will be selected.";
    const sampleContent = `The quick brown fox jumps over the lazy dog. ${selectedText}`;
    await page.getByTestId("source-note-create-title-input").fill(uniqueTitle);
    await page
      .getByTestId("source-note-create-content-input")
      .fill(sampleContent);
    await page.getByTestId("source-note-create-submit-btn").click();

    // 3. Wait for the source detail page to load and capture the source ID
    await page.waitForURL(/\/source\/\d+/);
    const urlMatch = page.url().match(/\/source\/(\d+)/);
    expect(urlMatch).toBeTruthy();
    const sourceId = urlMatch![1];

    // 4. Wait for the article content to be visible
    await expect(page.getByTestId("source-detail-article")).toBeVisible();
    await expect(page.getByTestId("source-detail-content-plain")).toBeVisible();

    // 5. Select the specific sentence programmatically
    const firstParagraph = page
      .locator('[data-testid="source-detail-content-plain"] p')
      .first();

    await firstParagraph.evaluate((el, text) => {
      const textNode = el.firstChild;
      if (!textNode || !textNode.textContent) return;

      const startIdx = textNode.textContent.indexOf(text);
      if (startIdx === -1) return;
      const endIdx = startIdx + text.length;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Trigger mouseup so the selection bubble appears
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    }, selectedText);

    // 6. Wait for the selection bubble to appear and click the “Listen” button
    await expect(page.getByTestId("selection-bubble")).toBeVisible();
    await page.getByTestId("selection-bubble-listen-btn").click();

    // 7. Wait for the TTS player to become visible
    const ttsPlayer = page.locator('[data-testid="tts-player"]');
    await expect(ttsPlayer).toBeVisible({ timeout: 10000 });

    // 8. Wait for the loading state to finish (spinner disappears, play button appears)
    // The player shows a spinner while loading (state === "loading")
    // We can wait for the play/pause toggle button to appear, which indicates the audio is ready.
    const toggleButton = ttsPlayer.locator('[data-testid="tts-player-toggle"]');
    await expect(toggleButton).toBeVisible({ timeout: 15000 });

    // 9. Verify the displayed text contains the selected text (or its truncated version)
    const displayedText = ttsPlayer.locator('[data-testid="tts-player-text"]');
    await expect(displayedText).toContainText(selectedText);

    // 10. Verify the stop button exists
    const stopButton = ttsPlayer.locator('[data-testid="tts-player-stop"]');
    await expect(stopButton).toBeVisible();

    // Optional: Click stop and verify the player disappears
    await stopButton.click();
    await expect(ttsPlayer).not.toBeVisible();

    // 11. Go back to the sources list
    await page.getByTestId("source-detail-back-btn").click();
    await page.waitForURL(`${FRONTEND_URL}/source`);
    await expect(page.getByTestId("source-list")).toBeVisible();

    // 12. Locate the source item by its ID and delete it
    const sourceItem = page.locator(
      `[data-testid="source-list-item-${sourceId}"]`
    );
    await expect(sourceItem).toBeVisible();
    await sourceItem
      .locator(`[data-testid="source-list-delete-btn-${sourceId}"]`)
      .click();

    // 13. Confirm deletion
    await page.getByRole("button", { name: "Yes" }).click();

    // 14. Wait for the item to disappear
    await expect(sourceItem).not.toBeVisible();

    // Optional: check success notification
    const successNotif = page.getByText("Source deleted");
    await expect(successNotif).toBeVisible();
  });
});