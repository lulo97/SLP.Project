import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:5140/api";

const adminUser = {
  username: "admin",
  password: "123",
};

function generateQuiz() {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  return {
    title: `Playwright Quiz ${id}`,
    description: "Quiz created by Playwright API test",
    visibility: "private",
    tagNames: ["playwright", "api-test"],
  };
}

function generateQuestionSnapshot(order) {
  return {
    type: "multiple_choice",
    content: `Sample question ${order}`,
    explanation: "Explanation for sample question",
    metadata: {
      options: [
        { id: "0", text: "Option A" },
        { id: "1", text: "Option B" },
      ],
      correctAnswers: ["0"],
    },
    tags: ["playwright"],
  };
}

test.describe("Quiz & QuizQuestion API End-to-End", () => {
  test("Complete flow: create quiz → manage questions → duplicate → search → delete", async ({
    request,
  }) => {
    let authToken;

    // -----------------------------
    // 1. Admin login
    // -----------------------------
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: adminUser,
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
    expect(authToken).toBeTruthy();

    const authHeaders = {
      "X-Session-Token": authToken,
    };

    // -----------------------------
    // 2. Verify token works by fetching current user
    // -----------------------------
    const meRes = await request.get(`${API_BASE_URL}/users/me`, {
      headers: authHeaders,
    });
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.username).toBe(adminUser.username);

    // -----------------------------
    // 3. Create a quiz
    // -----------------------------
    const quizData = generateQuiz();
    const createQuizRes = await request.post(`${API_BASE_URL}/quiz`, {
      headers: authHeaders,
      data: quizData,
    });
    expect(createQuizRes.status()).toBe(201);
    const createdQuiz = await createQuizRes.json();
    expect(createdQuiz).toMatchObject({
      title: quizData.title,
      description: quizData.description,
      visibility: quizData.visibility,
      tags: quizData.tagNames,
    });
    const quizId = createdQuiz.id;

    // -----------------------------
    // 4. Get the created quiz
    // -----------------------------
    const getQuizRes = await request.get(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
    });
    expect(getQuizRes.status()).toBe(200);
    const fetchedQuiz = await getQuizRes.json();
    expect(fetchedQuiz.id).toBe(quizId);

    // -----------------------------
    // 5. Update the quiz (preserve original title so search still works)
    // -----------------------------
    const updatedTitle = quizData.title + " Updated"; // Keep "Playwright" in title
    const updateRes = await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
      data: { title: updatedTitle, description: "New description" },
    });
    expect(updateRes.status()).toBe(200);
    const updatedQuiz = await updateRes.json();
    expect(updatedQuiz.title).toBe(updatedTitle);
    expect(updatedQuiz.description).toBe("New description");

    // -----------------------------
    // 6. Create first question (snapshot)
    // -----------------------------
    const snapshot1 = generateQuestionSnapshot(1);
    const createQ1Res = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/questions`,
      {
        headers: authHeaders,
        data: {
          questionSnapshotJson: JSON.stringify(snapshot1),
          displayOrder: 1,
        },
      },
    );
    expect(createQ1Res.status()).toBe(201);
    const q1 = await createQ1Res.json();
    expect(q1.quizId).toBe(quizId);
    expect(q1.displayOrder).toBe(1);
    const questionId1 = q1.id;

    // -----------------------------
    // 7. Create second question (snapshot)
    // -----------------------------
    const snapshot2 = generateQuestionSnapshot(2);
    const createQ2Res = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/questions`,
      {
        headers: authHeaders,
        data: {
          questionSnapshotJson: JSON.stringify(snapshot2),
          displayOrder: 2,
        },
      },
    );
    expect(createQ2Res.status()).toBe(201);
    const q2 = await createQ2Res.json();
    expect(q2.displayOrder).toBe(2);
    const questionId2 = q2.id;

    // -----------------------------
    // 8. List questions for quiz
    // -----------------------------
    const listRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/questions`,
      {
        headers: authHeaders,
      },
    );
    expect(listRes.status()).toBe(200);
    const questions = await listRes.json();
    expect(questions.length).toBe(2);
    expect(questions[0].displayOrder).toBe(1);
    expect(questions[1].displayOrder).toBe(2);

    // -----------------------------
    // 9. Get first question by ID
    // -----------------------------
    const getQRes = await request.get(
      `${API_BASE_URL}/quiz/questions/${questionId1}`,
      {
        headers: authHeaders,
      },
    );
    expect(getQRes.status()).toBe(200);
    const fetchedQ = await getQRes.json();
    expect(fetchedQ.id).toBe(questionId1);
    expect(fetchedQ.quizId).toBe(quizId);

    // -----------------------------
    // 10. Update first question (change content)
    // -----------------------------
    const updatedSnapshot = {
      ...snapshot1,
      content: "Updated question content",
    };
    const updateQRes = await request.put(
      `${API_BASE_URL}/quiz/questions/${questionId1}`,
      {
        headers: authHeaders,
        data: {
          questionSnapshotJson: JSON.stringify(updatedSnapshot),
          displayOrder: 1,
        },
      },
    );
    expect(updateQRes.status()).toBe(200);
    const updatedQ = await updateQRes.json();
    const parsedSnapshot = JSON.parse(updatedQ.questionSnapshotJson);
    expect(parsedSnapshot.content).toBe("Updated question content");

    // -----------------------------
    // 11. Delete second question
    // -----------------------------
    const delQRes = await request.delete(
      `${API_BASE_URL}/quiz/questions/${questionId2}`,
      {
        headers: authHeaders,
      },
    );
    expect(delQRes.status()).toBe(204);

    // Verify deletion
    const getDeletedRes = await request.get(
      `${API_BASE_URL}/quiz/questions/${questionId2}`,
      {
        headers: authHeaders,
      },
    );
    expect(getDeletedRes.status()).toBe(404);

    // -----------------------------
    // 12. Duplicate the quiz (should copy remaining question)
    // -----------------------------
    const duplicateRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/duplicate`,
      {
        headers: authHeaders,
      },
    );
    expect(duplicateRes.status()).toBe(201);
    const duplicatedQuiz = await duplicateRes.json();
    expect(duplicatedQuiz.title).toContain("(Copy)");
    const dupId = duplicatedQuiz.id;

    // Get questions of duplicated quiz
    const dupQuestionsRes = await request.get(
      `${API_BASE_URL}/quiz/${dupId}/questions`,
      {
        headers: authHeaders,
      },
    );
    expect(dupQuestionsRes.status()).toBe(200);
    const dupQuestions = await dupQuestionsRes.json();
    expect(dupQuestions.length).toBe(1); // only the first question was copied
    expect(dupQuestions[0].displayOrder).toBe(1);

    // Cleanup duplicate
    const delDupRes = await request.delete(`${API_BASE_URL}/quiz/${dupId}`, {
      headers: authHeaders,
    });
    expect(delDupRes.status()).toBe(204);

    // -----------------------------
    // 13. Quiz Notes tests
    // -----------------------------
    const noteTitle = `Test Note ${Date.now()}`;
    const noteContent = "This is a test note content.";

    // 13.1 Initially no notes
    const getNotesRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
      },
    );
    expect(getNotesRes.status()).toBe(200);
    let notes = await getNotesRes.json();
    expect(notes).toEqual([]);

    // 13.2 Create a new note (attached to quiz)
    const createNoteRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
        data: {
          title: noteTitle,
          content: noteContent,
        },
      },
    );
    expect(createNoteRes.status()).toBe(201);
    const createdNote = await createNoteRes.json();
    expect(createdNote).toMatchObject({
      title: noteTitle,
      content: noteContent,
    });
    expect(createdNote.id).toBeDefined();
    const noteId = createdNote.id;

    // 13.3 Verify note appears in list
    const getNotesAfterCreateRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
      },
    );
    expect(getNotesAfterCreateRes.status()).toBe(200);
    notes = await getNotesAfterCreateRes.json();
    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe(noteId);
    expect(notes[0].title).toBe(noteTitle);

    // 13.4 Remove the note from quiz
    const removeNoteRes = await request.delete(
      `${API_BASE_URL}/quiz/${quizId}/notes/${noteId}`,
      {
        headers: authHeaders,
      },
    );
    expect(removeNoteRes.status()).toBe(204);

    // 13.5 Verify note is removed
    const getNotesAfterRemoveRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
      },
    );
    expect(getNotesAfterRemoveRes.status()).toBe(200);
    notes = await getNotesAfterRemoveRes.json();
    expect(notes).toEqual([]);

    // 13.6 Re-attach the same note using its ID
    const attachExistingRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
        data: {
          noteId: noteId,
        },
      },
    );
    expect(attachExistingRes.status()).toBe(201);
    const attachedNote = await attachExistingRes.json();
    expect(attachedNote.id).toBe(noteId);

    // 13.7 Verify note is back
    const getNotesAfterAttachRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
      },
    );
    expect(getNotesAfterAttachRes.status()).toBe(200);
    notes = await getNotesAfterAttachRes.json();
    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe(noteId);

    // 13.8 Try to attach a non-existent note (should fail)
    const invalidAttachRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
        data: {
          noteId: 999999,
        },
      },
    );
    expect(invalidAttachRes.status()).toBe(400); // or 404 depending on implementation

    // 13.9 Try to add a note without title/content and without noteId (should fail)
    const invalidCreateRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/notes`,
      {
        headers: authHeaders,
        data: {},
      },
    );
    expect(invalidCreateRes.status()).toBe(400);

    // 13.10 Clean up: remove the note again (optional)
    // We'll keep it attached; when quiz is deleted, quiz_note entries will be cascaded.

    // -----------------------------
    // 14. Quiz Sources tests (new)
    // -----------------------------
    const sourceTitle1 = `Test Source 1 ${Date.now()}`;
    const sourceContent1 = "Content of source 1";
    const sourceTitle2 = `Test Source 2 ${Date.now() + 1}`;
    const sourceContent2 = "Content of source 2";

    // 14.1 Initially no sources
    const getSourcesRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
      },
    );
    expect(getSourcesRes.status()).toBe(200);
    let sources = await getSourcesRes.json();
    expect(sources).toEqual([]);

    // 14.2 Create two sources via /source/note
    const createSource1Res = await request.post(`${API_BASE_URL}/source/note`, {
      headers: authHeaders,
      data: {
        title: sourceTitle1,
        content: sourceContent1,
      },
    });
    expect(createSource1Res.status()).toBe(201);
    const source1 = await createSource1Res.json();
    expect(source1.title).toBe(sourceTitle1);
    const sourceId1 = source1.id;

    const createSource2Res = await request.post(`${API_BASE_URL}/source/note`, {
      headers: authHeaders,
      data: {
        title: sourceTitle2,
        content: sourceContent2,
      },
    });
    expect(createSource2Res.status()).toBe(201);
    const source2 = await createSource2Res.json();
    expect(source2.title).toBe(sourceTitle2);
    const sourceId2 = source2.id;

    // 14.3 Attach first source to quiz
    const attachSource1Res = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
        data: {
          sourceId: sourceId1,
        },
      },
    );
    expect(attachSource1Res.status()).toBe(200); // Created? The controller returns Ok with source
    const attachedSource1 = await attachSource1Res.json();
    expect(attachedSource1.id).toBe(sourceId1);

    // 14.4 Verify sources list now contains one
    const getSourcesAfterAttach1Res = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
      },
    );
    expect(getSourcesAfterAttach1Res.status()).toBe(200);
    sources = await getSourcesAfterAttach1Res.json();
    expect(sources.length).toBe(1);
    expect(sources[0].id).toBe(sourceId1);
    expect(sources[0].title).toBe(sourceTitle1);

    // 14.5 Attach second source
    const attachSource2Res = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
        data: {
          sourceId: sourceId2,
        },
      },
    );
    expect(attachSource2Res.status()).toBe(200);
    const attachedSource2 = await attachSource2Res.json();
    expect(attachedSource2.id).toBe(sourceId2);

    // 14.6 Verify sources list now has two
    const getSourcesAfterAttach2Res = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
      },
    );
    expect(getSourcesAfterAttach2Res.status()).toBe(200);
    sources = await getSourcesAfterAttach2Res.json();
    expect(sources.length).toBe(2);
    expect(sources.map((s) => s.id)).toEqual(
      expect.arrayContaining([sourceId1, sourceId2]),
    );

    // 14.7 Remove first source
    const removeSource1Res = await request.delete(
      `${API_BASE_URL}/quiz/${quizId}/sources/${sourceId1}`,
      {
        headers: authHeaders,
      },
    );
    expect(removeSource1Res.status()).toBe(204);

    // 14.8 Verify source is removed
    const getSourcesAfterRemoveRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
      },
    );
    expect(getSourcesAfterRemoveRes.status()).toBe(200);
    sources = await getSourcesAfterRemoveRes.json();
    expect(sources.length).toBe(1);
    expect(sources[0].id).toBe(sourceId2);

    // 14.9 Try to attach a non-existent source (should fail)
    const attachInvalidRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
        data: {
          sourceId: 999999,
        },
      },
    );
    expect(attachInvalidRes.status()).toBe(400);

    // 14.10 Try to attach a source that does not belong to the user (if possible)
    // For simplicity we skip creating another user; but we can rely on the service throwing UnauthorizedAccessException.
    // The service checks ownership via source.UserId == userId.
    // To test this we would need another user's source; not implemented here.

    // 14.11 Re-attach the first source to ensure idempotency (optional)
    const reattachSource1Res = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
        data: {
          sourceId: sourceId1,
        },
      },
    );
    expect(reattachSource1Res.status()).toBe(200);
    const reattached = await reattachSource1Res.json();
    expect(reattached.id).toBe(sourceId1);

    // 14.12 Verify now two sources again
    const getSourcesAfterReattachRes = await request.get(
      `${API_BASE_URL}/quiz/${quizId}/sources`,
      {
        headers: authHeaders,
      },
    );
    expect(getSourcesAfterReattachRes.status()).toBe(200);
    sources = await getSourcesAfterReattachRes.json();
    expect(sources.length).toBe(2);

    // Clean up sources (optional) – they will be deleted when quiz is deleted? No, source deletion is separate.
    // But we can delete them to avoid leftover data.
    const delSource1Res = await request.delete(
      `${API_BASE_URL}/source/${sourceId1}`,
      {
        headers: authHeaders,
      },
    );
    expect(delSource1Res.status()).toBe(204);
    const delSource2Res = await request.delete(
      `${API_BASE_URL}/source/${sourceId2}`,
      {
        headers: authHeaders,
      },
    );
    expect(delSource2Res.status()).toBe(204);

    // -----------------------------
    // 15. Change quiz visibility to public and search
    // -----------------------------
    const visibilityRes = await request.put(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
      data: { visibility: "public" },
    });
    expect(visibilityRes.status()).toBe(200);

    // Search (public endpoint, no auth required)
    const searchRes = await request.get(
      `${API_BASE_URL}/quiz?search=Playwright`,
    );
    expect(searchRes.status()).toBe(200);
    const searchResults = await searchRes.json();
    const found = searchResults.some((q) => q.id === quizId);
    expect(found).toBe(true);

    // -----------------------------
    // 16. Get my quizzes (authenticated)
    // -----------------------------
    const myQuizzesRes = await request.get(`${API_BASE_URL}/quiz?mine=true`, {
      headers: authHeaders,
    });
    expect(myQuizzesRes.status()).toBe(200);
    const myQuizzes = await myQuizzesRes.json();
    expect(myQuizzes.some((q) => q.id === quizId)).toBe(true);

    // -----------------------------
    // 17. Edge case: invalid JSON when creating question (should fail)
    // -----------------------------
    const invalidRes = await request.post(
      `${API_BASE_URL}/quiz/${quizId}/questions`,
      {
        headers: authHeaders,
        data: {
          questionSnapshotJson: "{invalid json",
          displayOrder: 10,
        },
      },
    );
    expect(invalidRes.status()).toBe(400);

    // -----------------------------
    // 18. Edge case: access non‑existent quiz/question
    // -----------------------------
    const nonExistentQuiz = await request.get(`${API_BASE_URL}/quiz/999999`, {
      headers: authHeaders,
    });
    expect(nonExistentQuiz.status()).toBe(404);

    const nonExistentQ = await request.get(
      `${API_BASE_URL}/quiz/questions/999999`,
      {
        headers: authHeaders,
      },
    );
    expect(nonExistentQ.status()).toBe(404);

    // -----------------------------
    // 19. Delete original quiz and verify everything is gone
    // -----------------------------
    const delQuizRes = await request.delete(`${API_BASE_URL}/quiz/${quizId}`, {
      headers: authHeaders,
    });
    expect(delQuizRes.status()).toBe(204);

    const getQuizAfterDel = await request.get(
      `${API_BASE_URL}/quiz/${quizId}`,
      {
        headers: authHeaders,
      },
    );
    expect(getQuizAfterDel.status()).toBe(404);

    const getQAfterDel = await request.get(
      `${API_BASE_URL}/quiz/questions/${questionId1}`,
      {
        headers: authHeaders,
      },
    );
    expect(getQAfterDel.status()).toBe(404);
  });
});
