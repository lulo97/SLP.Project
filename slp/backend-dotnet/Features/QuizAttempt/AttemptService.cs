using backend_dotnet.Features.Quiz;
using System.Text.Json;

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

    public async Task<StartAttemptResponseDto> StartAttemptAsync(int quizId, int userId)
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

        foreach (var q in questions)
        {
            await _attemptRepository.AddAnswerAsync(new QuizAttemptAnswer
            {
                AttemptId = attempt.Id,
                QuizQuestionId = q.Id,
                QuestionSnapshotJson = q.QuestionSnapshotJson ?? "{}",
                AnswerJson = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        return new StartAttemptResponseDto
        {
            AttemptId = attempt.Id,
            StartTime = attempt.StartTime,
            QuestionCount = attempt.QuestionCount,
            MaxScore = attempt.MaxScore,
            Questions = questions.Select(q => new AttemptQuestionDto
            {
                QuizQuestionId = q.Id,
                DisplayOrder = q.DisplayOrder,
                QuestionSnapshotJson = q.QuestionSnapshotJson ?? "{}",
            }).ToList(),
        };
    }

    // ── Get ───────────────────────────────────────────────────────────────────

    public async Task<AttemptDto?> GetAttemptAsync(int attemptId, int userId, bool isAdmin)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null)
            return null;

        if (!isAdmin && attempt.UserId != userId)
            return null;

        // Auto-abandon after 24 hours
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
        if (attempt == null)
            throw new ArgumentException("Attempt not found");
        if (attempt.UserId != userId)
            throw new UnauthorizedAccessException("Not your attempt");
        if (attempt.Status != "in_progress")
            throw new InvalidOperationException("Attempt is already completed or abandoned");

        var answer = await _attemptRepository.GetAnswerAsync(attemptId, dto.QuizQuestionId);
        if (answer == null)
            throw new ArgumentException("Question not part of this attempt");

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
        if (attempt == null)
            throw new ArgumentException("Attempt not found");
        if (attempt.UserId != userId)
            throw new UnauthorizedAccessException("Not your attempt");
        if (attempt.Status != "in_progress")
            throw new InvalidOperationException("Attempt already completed or abandoned");

        var answers = await _attemptRepository.GetAnswersByAttemptIdAsync(attemptId);
        int score = 0;

        foreach (var ans in answers)
        {
            if (IsFlashcard(ans.QuestionSnapshotJson))
            {
                // Flashcards are informational — never scored, always null
                ans.IsCorrect = null;
            }
            else
            {
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
        if (attempt == null)
            return null;
        if (!isAdmin && attempt.UserId != userId)
            return null;

        // Review only available for completed attempts
        if (attempt.Status != "completed")
            return null;

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

    // ── Evaluation ────────────────────────────────────────────────────────────

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
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Canonical field: metadata.correctAnswers (string[])
    /// Answer field:    selected (string[])
    /// Graded:          exact set equality
    /// </summary>
    private static bool EvaluateMultipleChoice(JsonElement q, JsonElement a)
    {
        var meta = q.GetProperty("metadata");
        var correctIds = meta.GetProperty("correctAnswers")
            .EnumerateArray()
            .Select(x => x.GetString() ?? "")
            .ToHashSet();

        if (!a.TryGetProperty("selected", out var selectedEl) ||
            selectedEl.ValueKind != JsonValueKind.Array)
            return false;

        var selectedIds = selectedEl.EnumerateArray()
            .Select(x => x.GetString() ?? "")
            .ToHashSet();

        return correctIds.SetEquals(selectedIds);
    }

    /// <summary>
    /// Canonical field: metadata.correctAnswers (string[] with exactly 1 element)
    /// Answer field:    selected (string — single id)
    /// Graded:          exact string equality
    /// </summary>
    private static bool EvaluateSingleChoice(JsonElement q, JsonElement a)
    {
        var meta = q.GetProperty("metadata");
        var correctId = meta.GetProperty("correctAnswers")
            .EnumerateArray()
            .Select(x => x.GetString() ?? "")
            .First();

        if (!a.TryGetProperty("selected", out var selectedEl) ||
            selectedEl.ValueKind != JsonValueKind.String)
            return false;

        return correctId == (selectedEl.GetString() ?? "");
    }

    /// <summary>
    /// Canonical field: metadata.correctAnswer (boolean)
    /// Answer field:    selected (boolean)
    /// Graded:          exact boolean equality
    /// </summary>
    private static bool EvaluateTrueFalse(JsonElement q, JsonElement a)
    {
        var correctAnswer = q.GetProperty("metadata")
            .GetProperty("correctAnswer")
            .GetBoolean();

        if (!a.TryGetProperty("selected", out var selectedEl))
            return false;

        bool selected = selectedEl.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => false, // malformed — treat as wrong
        };

        return correctAnswer == selected;
    }

    /// <summary>
    /// Canonical fields: metadata.keywords
    /// Answer field:     answer (string)
    /// Graded:           user answer (trimmed, lower) ∈ keywords set (trimmed, lower)
    /// </summary>
    private static bool EvaluateFillBlank(JsonElement q, JsonElement a)
    {
        //q = ValueKind = Object : "{"tags": [], "type": "fill_blank", "content": "Nhiệt độ sôi của nước là 100 độ", "metadata": {"keywords": ["100"]}, "explanation": null}"
        //a = ValueKind = Object : "{"answer": "100"}"
        var acceptedAnswers = q.GetProperty("metadata")
            .GetProperty("keywords")
            .EnumerateArray()
            .Select(x => x.GetString()?.Trim().ToLowerInvariant() ?? "")
            .ToHashSet();

        if (!a.TryGetProperty("answer", out var answerEl) ||
            answerEl.ValueKind != JsonValueKind.String)
            return false;

        var userAnswer = answerEl.GetString()?.Trim().ToLowerInvariant() ?? "";
        return acceptedAnswers.Contains(userAnswer);
    }

    /// <summary>
    /// Canonical field: metadata.items (Array of { order_id: int, text: string })
    /// Correct order:   items sorted by order_id ascending (no separate correctOrder field)
    /// Answer field:    order (int[]) — array of order_id in user-chosen sequence
    /// Graded:          user sequence exactly matches items sorted by order_id asc
    /// </summary>
    private static bool EvaluateOrdering(JsonElement q, JsonElement a)
    {
        var correctOrder = q.GetProperty("metadata")
            .GetProperty("items")
            .EnumerateArray()
            .OrderBy(item => item.GetProperty("order_id").GetInt32())
            .Select(item => item.GetProperty("order_id").GetInt32())
            .ToList();

        if (!a.TryGetProperty("order", out var orderEl) ||
            orderEl.ValueKind != JsonValueKind.Array)
            return false;

        var userOrder = orderEl.EnumerateArray()
            .Select(x => x.GetInt32())
            .ToList();

        return correctOrder.SequenceEqual(userOrder);
    }

    /// <summary>
    /// Canonical field: metadata.pairs (Array of { id: int, left: string, right: string })
    /// Answer field:    matches (Array of { leftId: int, rightId: int })
    /// Graded:          all pairs matched AND every match has leftId == rightId
    /// </summary>
    private static bool EvaluateMatching(JsonElement q, JsonElement a)
    {
        var totalPairs = q.GetProperty("metadata")
            .GetProperty("pairs")
            .EnumerateArray()
            .Count();

        if (!a.TryGetProperty("matches", out var matchesEl) ||
            matchesEl.ValueKind != JsonValueKind.Array)
            return false;

        var matches = matchesEl.EnumerateArray().ToList();
        if (matches.Count != totalPairs)
            return false;

        return matches.All(m =>
            m.GetProperty("leftId").GetInt32() == m.GetProperty("rightId").GetInt32());
    }
}