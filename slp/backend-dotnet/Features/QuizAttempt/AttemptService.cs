using backend_dotnet.Features.Quiz;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace backend_dotnet.Features.QuizAttempt;

public class AttemptService : IAttemptService
{
    private readonly IAttemptRepository _attemptRepository;
    private readonly IQuizRepository _quizRepository;

    public AttemptService(IAttemptRepository attemptRepository, IQuizRepository quizRepository)
    {
        _attemptRepository = attemptRepository;
        _quizRepository = quizRepository;
    }

    // ── Start ─────────────────────────────────────────────────────────────────

    public async Task<StartAttemptResponseDto> StartAttemptAsync(
        int quizId, int userId, bool randomizeOrder = false)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId, includeDisabled: true);
        if (quiz == null)
            throw new ArgumentException("Quiz not found");

        if (quiz.Visibility == "private" && quiz.UserId != userId)
            throw new UnauthorizedAccessException("You cannot attempt this private quiz");

        if (quiz.Disabled)
            throw new InvalidOperationException("This quiz is disabled and cannot be attempted");

        var questions = quiz.QuizQuestions?.OrderBy(q => q.DisplayOrder).ToList() ?? new();

        if (questions.Count == 0)
            throw new InvalidOperationException("Cannot start attempt on a quiz with no questions.");

        // ── Feature 2: randomize question order ────────────────────────────
        if (randomizeOrder)
            questions = questions.OrderBy(_ => Random.Shared.Next()).ToList();

        // Flashcards are not scored
        int maxScore = questions.Count(q => !IsFlashcard(q.QuestionSnapshotJson));

        var attempt = new QuizAttempt
        {
            UserId = userId,
            QuizId = quizId,
            StartTime = DateTime.UtcNow,
            Status = "in_progress",
            MaxScore = maxScore,
            QuestionCount = questions.Count,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        attempt = await _attemptRepository.CreateAttemptAsync(attempt);

        // ── Feature 1 + 2: store shuffled snapshots, return them ───────────
        var questionDtos = new List<AttemptQuestionDto>();
        for (int i = 0; i < questions.Count; i++)
        {
            var q = questions[i];
            // Shuffle options/items inside the snapshot (stable ids, so grading is unaffected)
            var shuffledSnapshot = ShuffleOptionsInSnapshot(q.QuestionSnapshotJson ?? "{}");

            await _attemptRepository.AddAnswerAsync(new QuizAttemptAnswer
            {
                AttemptId = attempt.Id,
                QuizQuestionId = q.Id,
                QuestionSnapshotJson = shuffledSnapshot,   // store the shuffled version
                AnswerJson = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            questionDtos.Add(new AttemptQuestionDto
            {
                QuizQuestionId = q.Id,
                DisplayOrder = i + 1,             // re-numbered after shuffle
                QuestionSnapshotJson = shuffledSnapshot,
            });
        }

        return new StartAttemptResponseDto
        {
            AttemptId = attempt.Id,
            StartTime = attempt.StartTime,
            QuestionCount = attempt.QuestionCount,
            MaxScore = attempt.MaxScore,
            Questions = questionDtos,
        };
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    public async Task<AttemptDto?> GetAttemptAsync(int attemptId, int userId, bool isAdmin)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null) return null;
        if (!isAdmin && attempt.UserId != userId) return null;

        if (attempt.Status == "in_progress" && attempt.StartTime < DateTime.UtcNow.AddHours(-24))
        {
            attempt.Status = "abandoned";
            await _attemptRepository.UpdateAttemptAsync(attempt);
        }

        return MapToDto(attempt);
    }

    // ── Submit answer ─────────────────────────────────────────────────────────

    public async Task SubmitAnswerAsync(int attemptId, int userId, SubmitAnswerDto dto)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null) throw new ArgumentException("Attempt not found");
        if (attempt.UserId != userId) throw new UnauthorizedAccessException("Not your attempt");
        if (attempt.Status != "in_progress")
            throw new InvalidOperationException("Attempt is already completed or abandoned");

        var answer = await _attemptRepository.GetAnswerAsync(attemptId, dto.QuizQuestionId);
        if (answer == null) throw new ArgumentException("Question not part of this attempt");

        try { JsonDocument.Parse(dto.AnswerJson); }
        catch { throw new ArgumentException("Invalid answer JSON"); }

        answer.AnswerJson = dto.AnswerJson;
        answer.UpdatedAt = DateTime.UtcNow;
        await _attemptRepository.UpdateAnswerAsync(answer);
    }

    // ── Submit attempt ────────────────────────────────────────────────────────

    public async Task<AttemptDto> SubmitAttemptAsync(int attemptId, int userId)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null) throw new ArgumentException("Attempt not found");
        if (attempt.UserId != userId) throw new UnauthorizedAccessException("Not your attempt");
        if (attempt.Status != "in_progress")
            throw new InvalidOperationException("Attempt already completed or abandoned");

        var answers = await _attemptRepository.GetAnswersByAttemptIdAsync(attemptId);
        int score = 0;

        foreach (var ans in answers)
        {
            if (IsFlashcard(ans.QuestionSnapshotJson))
            {
                ans.IsCorrect = null;
            }
            else
            {
                // Grading works on ids — shuffled option order doesn't affect correctness
                bool correct = EvaluateAnswer(ans.QuestionSnapshotJson, ans.AnswerJson);
                ans.IsCorrect = correct;
                if (correct) score++;
            }

            ans.UpdatedAt = DateTime.UtcNow;
            await _attemptRepository.UpdateAnswerAsync(ans);
        }

        attempt.Score = score;
        attempt.EndTime = DateTime.UtcNow;
        attempt.Status = "completed";
        await _attemptRepository.UpdateAttemptAsync(attempt);

        return MapToDto(attempt);
    }

    // ── Review ────────────────────────────────────────────────────────────────

    public async Task<AttemptReviewDto?> GetAttemptReviewAsync(int attemptId, int userId, bool isAdmin)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null) return null;
        if (!isAdmin && attempt.UserId != userId) return null;
        if (attempt.Status != "completed") return null;

        return new AttemptReviewDto
        {
            Id = attempt.Id,
            UserId = attempt.UserId,
            QuizId = attempt.QuizId,
            QuizTitle = attempt.Quiz?.Title ?? "",
            StartTime = attempt.StartTime,
            EndTime = attempt.EndTime,
            Score = attempt.Score,
            MaxScore = attempt.MaxScore,
            QuestionCount = attempt.QuestionCount,
            Status = attempt.Status,
            AnswerReview = attempt.Answers.Select(a => new AttemptAnswerReviewDto
            {
                Id = a.Id,
                AttemptId = a.AttemptId,
                QuizQuestionId = a.QuizQuestionId,
                QuestionSnapshotJson = a.QuestionSnapshotJson,
                AnswerJson = a.AnswerJson,
                IsCorrect = a.IsCorrect ?? false,
            }).ToList(),
        };
    }

    // ── User attempts list ────────────────────────────────────────────────────

    public async Task<IEnumerable<AttemptDto>> GetUserAttemptsForQuizAsync(int quizId, int userId)
    {
        var attempts = await _attemptRepository.GetAttemptsByQuizAndUserAsync(quizId, userId);
        return attempts.Select(MapToDto);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static AttemptDto MapToDto(QuizAttempt attempt) => new()
    {
        Id = attempt.Id,
        UserId = attempt.UserId,
        QuizId = attempt.QuizId,
        StartTime = attempt.StartTime,
        EndTime = attempt.EndTime,
        Score = attempt.Score,
        MaxScore = attempt.MaxScore,
        QuestionCount = attempt.QuestionCount,
        Status = attempt.Status,
        Answers = attempt.Answers?.Select(a => new AttemptAnswerDto
        {
            Id = a.Id,
            AttemptId = a.AttemptId,
            QuizQuestionId = a.QuizQuestionId,
            QuestionSnapshotJson = a.QuestionSnapshotJson,
            AnswerJson = a.AnswerJson,
            IsCorrect = a.IsCorrect,
        }).ToList(),
    };

    // ── Option shuffling (Feature 1) ──────────────────────────────────────────

    /// <summary>
    /// Parses the snapshot JSON and randomly shuffles the display-order of
    /// options/items within it.  Answer ids are stable so grading is unaffected.
    ///
    /// Affected fields per type:
    ///   multiple_choice / single_choice → metadata.options[]
    ///   ordering                        → metadata.items[]
    ///   true_false / fill_blank / flashcard / matching → unchanged
    ///   (matching right-column is already shuffled client-side in MatchingQuestion.vue)
    /// </summary>
    private static string ShuffleOptionsInSnapshot(string snapshotJson)
    {
        try
        {
            var root = JsonNode.Parse(snapshotJson) as JsonObject;
            if (root is null) return snapshotJson;

            string type = root["type"]?.GetValue<string>() ?? "";
            var metadata = root["metadata"] as JsonObject;
            if (metadata is null) return snapshotJson;

            if (type is "multiple_choice" or "single_choice")
            {
                ShuffleJsonArray(metadata, "options");
            }
            else if (type == "ordering")
            {
                // Shuffle the visual order of items so they don't appear
                // sorted by order_id on every attempt.
                // Grading evaluates user's submitted order[] of order_id values,
                // not the snapshot order, so this is safe.
                ShuffleJsonArray(metadata, "items");
            }
            // true_false    — only two values (True/False), no array to shuffle
            // fill_blank    — keyword-based grading, nothing to shuffle
            // matching      — client shuffles right column via shuffledRight ref
            // flashcard     — informational, no answer

            return root.ToJsonString();
        }
        catch
        {
            return snapshotJson; // fall back to original on any parse error
        }
    }

    private static void ShuffleJsonArray(JsonObject parent, string key)
    {
        if (parent[key] is not JsonArray arr) return;

        // Clone + shuffle
        var items = arr.Select(n => n?.DeepClone()).ToList();
        var shuffled = items.OrderBy(_ => Random.Shared.Next()).ToList();

        parent.Remove(key);
        var newArr = new JsonArray();
        foreach (var item in shuffled)
            newArr.Add(item);
        parent[key] = newArr;
    }

    // ── Evaluation ────────────────────────────────────────────────────────────
    // (unchanged — all grading is id-based, not position-based)

    private static bool IsFlashcard(string? snapshotJson)
    {
        if (string.IsNullOrWhiteSpace(snapshotJson)) return false;
        try
        {
            var root = JsonDocument.Parse(snapshotJson).RootElement;
            return root.TryGetProperty("type", out var t) && t.GetString() == "flashcard";
        }
        catch { return false; }
    }

    private static bool EvaluateAnswer(string snapshotJson, string answerJson)
    {
        try
        {
            using var qDoc = JsonDocument.Parse(snapshotJson);
            using var aDoc = JsonDocument.Parse(answerJson);
            var q = qDoc.RootElement;
            var a = aDoc.RootElement;
            string type = q.GetProperty("type").GetString() ?? "";

            return type switch
            {
                "multiple_choice" => EvaluateMultipleChoice(q, a),
                "single_choice" => EvaluateSingleChoice(q, a),
                "true_false" => EvaluateTrueFalse(q, a),
                "fill_blank" => EvaluateFillBlank(q, a),
                "ordering" => EvaluateOrdering(q, a),
                "matching" => EvaluateMatching(q, a),
                _ => false,
            };
        }
        catch { return false; }
    }

    private static bool EvaluateMultipleChoice(JsonElement q, JsonElement a)
    {
        var correctIds = q.GetProperty("metadata").GetProperty("correctAnswers")
            .EnumerateArray().Select(x => x.GetString() ?? "").ToHashSet();

        if (!a.TryGetProperty("selected", out var selectedEl) ||
            selectedEl.ValueKind != JsonValueKind.Array) return false;

        var selectedIds = selectedEl.EnumerateArray()
            .Select(x => x.GetString() ?? "").ToHashSet();

        return correctIds.SetEquals(selectedIds);
    }

    private static bool EvaluateSingleChoice(JsonElement q, JsonElement a)
    {
        var correctId = q.GetProperty("metadata").GetProperty("correctAnswers")
            .EnumerateArray().Select(x => x.GetString() ?? "").First();

        if (!a.TryGetProperty("selected", out var selectedEl) ||
            selectedEl.ValueKind != JsonValueKind.String) return false;

        return correctId == (selectedEl.GetString() ?? "");
    }

    private static bool EvaluateTrueFalse(JsonElement q, JsonElement a)
    {
        var correctAnswer = q.GetProperty("metadata")
            .GetProperty("correctAnswer").GetBoolean();

        if (!a.TryGetProperty("selected", out var selectedEl)) return false;

        bool selected = selectedEl.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => false,
        };
        return correctAnswer == selected;
    }

    private static bool EvaluateFillBlank(JsonElement q, JsonElement a)
    {
        var acceptedAnswers = q.GetProperty("metadata").GetProperty("keywords")
            .EnumerateArray()
            .Select(x => x.GetString()?.Trim().ToLowerInvariant() ?? "")
            .ToHashSet();

        if (!a.TryGetProperty("answer", out var answerEl) ||
            answerEl.ValueKind != JsonValueKind.String) return false;

        return acceptedAnswers.Contains(answerEl.GetString()?.Trim().ToLowerInvariant() ?? "");
    }

    private static bool EvaluateOrdering(JsonElement q, JsonElement a)
    {
        // Correct order = items sorted by order_id ascending.
        // Shuffling the snapshot items array doesn't affect this —
        // grading compares order_id sequences, not array positions.
        var correctOrder = q.GetProperty("metadata").GetProperty("items")
            .EnumerateArray()
            .OrderBy(item => item.GetProperty("order_id").GetInt32())
            .Select(item => item.GetProperty("order_id").GetInt32())
            .ToList();

        if (!a.TryGetProperty("order", out var orderEl) ||
            orderEl.ValueKind != JsonValueKind.Array) return false;

        var userOrder = orderEl.EnumerateArray().Select(x => x.GetInt32()).ToList();
        return correctOrder.SequenceEqual(userOrder);
    }

    private static bool EvaluateMatching(JsonElement q, JsonElement a)
    {
        var totalPairs = q.GetProperty("metadata").GetProperty("pairs")
            .EnumerateArray().Count();

        if (!a.TryGetProperty("matches", out var matchesEl) ||
            matchesEl.ValueKind != JsonValueKind.Array) return false;

        var matches = matchesEl.EnumerateArray().ToList();
        if (matches.Count != totalPairs) return false;

        return matches.All(m =>
            m.GetProperty("leftId").GetInt32() == m.GetProperty("rightId").GetInt32());
    }
}