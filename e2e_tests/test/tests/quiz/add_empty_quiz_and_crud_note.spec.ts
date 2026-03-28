
import { test, expect } from "@playwright/test";
import { loginAsAdmin, getUniqueTitle, FRONTEND_URL } from "../question/utils";

test("admin can create a quiz, add/edit/delete a note, then delete the quiz", async ({ page }) => {
  const quizTitle = getUniqueTitle("Quiz with Note");
  const noteTitle = getUniqueTitle("My Note");
  const noteContent = "This is the initial content.";
  const editedTitle = getUniqueTitle("Updated Note");
  const editedContent = "This content has been updated.";

  // ---------- 1. Create an empty quiz ----------
  await loginAsAdmin(page);
  await page.goto(`${FRONTEND_URL}/quiz`);
  await expect(page).toHaveURL(/\/quiz$/);

  const createFab = page.getByTestId("create-quiz-fab");
  await createFab.click();
  await expect(page).toHaveURL(/\/quiz\/new/);

  await page.getByTestId("quiz-title-input").fill(quizTitle);
  await page.getByTestId("quiz-description-input").fill("This quiz will have notes");
  const publicRadio = page.getByTestId("quiz-visibility-public");
  await publicRadio.check();

  // Optional tag
  const tagSelector = page.getByTestId("tag-selector");
  await tagSelector.click();
  const tagInput = tagSelector.locator("input");
  await tagInput.fill(`note-test-${Date.now()}`);
  await tagInput.press("Enter");
  await tagInput.press("Escape");

  const submitButton = page.getByTestId("quiz-submit-button");
  await submitButton.click();
  await expect(page).toHaveURL(/\/quiz\/\d+/);
  await expect(page.getByTestId("quiz-title")).toHaveText(quizTitle);

  // ---------- 2. Add a note ----------
  const addNoteButton = page.getByTestId("add-note-button");
  await addNoteButton.click();

  // Modal appears – fill and save
  const noteModal = page.getByTestId("note-modal");
  await noteModal.getByTestId("note-title-input").fill(noteTitle);
  await noteModal.getByTestId("note-content-input").fill(noteContent);
  await page.getByTestId("note-save-button").click(); //Get by page because save button antd not in note-modal

  // Wait for the note to appear in the list
  const noteItem = page.locator(`[data-testid^="note-item-"]:has-text("${noteTitle}")`);
  await expect(noteItem).toBeVisible();

  // Extract note ID from the data-testid (e.g., "note-item-123")
  const noteTestId = await noteItem.getAttribute("data-testid");
  const noteId = noteTestId?.replace("note-item-", "");
  if (!noteId) throw new Error("Could not extract note ID");

  // ---------- 3. Edit the note ----------
  const editButton = page.getByTestId(`edit-note-${noteId}`);
  await editButton.click();

  // Modal opens again, update fields
  const editModal = page.getByTestId("note-modal");
  await editModal.getByTestId("note-title-input").fill(editedTitle);
  await editModal.getByTestId("note-content-input").fill(editedContent);
  await page.getByTestId("note-save-button").click();

  // Verify the updated note appears with the new title
  const updatedNoteItem = page.locator(`[data-testid^="note-item-"]:has-text("${editedTitle}")`);
  await expect(updatedNoteItem).toBeVisible();
  // Optionally check content
  const noteContentElement = updatedNoteItem.locator("p"); // the content is in a <p>
  await expect(noteContentElement).toHaveText(editedContent);

  // ---------- 4. Delete the note ----------
  const deleteButton = page.getByTestId(`delete-note-${noteId}`);
  await deleteButton.click();

  // After deletion, the note should disappear
  await expect(updatedNoteItem).not.toBeVisible();

  // ---------- 5. Delete the quiz ----------
  const deleteQuizButton = page.getByTestId("delete-quiz-button");
  await deleteQuizButton.click();

  const confirmButton = page.getByRole("button", { name: "Yes" });
  await confirmButton.click();

  // After deletion, we are back at the quiz list
  await expect(page).toHaveURL(/\/quiz$/);

  // Switch to public tab and verify the quiz is gone
  await page.getByTestId("tab-public-quizzes").click();
  const searchInput = page.getByTestId("search-quizzes-input");
  await searchInput.fill(quizTitle);
  await searchInput.press("Enter");

  const quizItem = page.locator(`[data-testid^="quiz-list-item-"]:has-text("${quizTitle}")`);
  await expect(quizItem).not.toBeVisible();
});