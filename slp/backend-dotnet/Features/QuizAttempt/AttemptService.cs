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

    public async Task<StartAttemptResponseDto> StartAttemptAsync(int quizId, int userId)
    {
        // Fetch quiz even if disabled so we can check ownership and disabled state
        var quiz = await _quizRepository.GetByIdAsync(quizId, includeDisabled: true);   // <-- FIXED
        if (quiz == null)
            throw new ArgumentException("Quiz not found");

        // Check visibility and ownership
        if (quiz.Visibility == "private" && quiz.UserId != userId)
            throw new UnauthorizedAccessException("You cannot attempt this private quiz");

        // Check if quiz is disabled (admin‑disabled)
        if (quiz.Disabled)
            throw new InvalidOperationException("This quiz is disabled and cannot be attempted");

        // Calculate max score (skip flashcards)
        int maxScore = 0;
        var questions = quiz.QuizQuestions?.OrderBy(q => q.DisplayOrder).ToList() ?? new();
        foreach (var q in questions)
        {
            try
            {
                var snapshot = JsonDocument.Parse(q.QuestionSnapshotJson ?? "{}").RootElement;
                string type = snapshot.GetProperty("type").GetString() ?? "";
                if (type != "flashcard")
                    maxScore++;
            }
            catch
            {
                // If we can't parse, assume it's a scored question
                maxScore++;
            }
        }

        var attempt = new QuizAttempt
        {
            UserId = userId,
            QuizId = quizId,
            StartTime = DateTime.UtcNow,
            Status = "in_progress",
            MaxScore = maxScore,
            QuestionCount = questions.Count,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        attempt = await _attemptRepository.CreateAttemptAsync(attempt);

        // Create answer records with snapshots
        foreach (var q in questions)
        {
            var answer = new QuizAttemptAnswer
            {
                AttemptId = attempt.Id,
                QuizQuestionId = q.Id,
                QuestionSnapshotJson = q.QuestionSnapshotJson ?? "{}",
                AnswerJson = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _attemptRepository.AddAnswerAsync(answer);
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
                QuestionSnapshotJson = q.QuestionSnapshotJson ?? "{}"
            }).ToList()
        };
    }

    public async Task<AttemptDto?> GetAttemptAsync(int attemptId, int userId, bool isAdmin)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null)
            return null;

        if (!isAdmin && attempt.UserId != userId)
            return null;

        // Auto‑abandon after 24 hours
        if (attempt.Status == "in_progress" && attempt.StartTime < DateTime.UtcNow.AddHours(-24))
        {
            attempt.Status = "abandoned";
            await _attemptRepository.UpdateAttemptAsync(attempt);
        }

        return MapToDto(attempt);
    }

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

        // Validate JSON
        try { JsonDocument.Parse(dto.AnswerJson); } catch { throw new ArgumentException("Invalid answer JSON"); }

        answer.AnswerJson = dto.AnswerJson;
        answer.UpdatedAt = DateTime.UtcNow;
        await _attemptRepository.UpdateAnswerAsync(answer);
    }

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
            // Determine if question is a flashcard (unscored)
            bool isScored = true;
            try
            {
                var snapshot = JsonDocument.Parse(ans.QuestionSnapshotJson).RootElement;
                string type = snapshot.GetProperty("type").GetString() ?? "";
                if (type == "flashcard")
                    isScored = false;
            }
            catch { /* treat as scored */ }

            if (isScored)
            {
                bool correct = EvaluateAnswer(ans.QuestionSnapshotJson, ans.AnswerJson);
                ans.IsCorrect = correct;
                if (correct) score++;
            }
            else
            {
                ans.IsCorrect = null; // flashcard: no correctness
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

    public async Task<AttemptReviewDto?> GetAttemptReviewAsync(int attemptId, int userId, bool isAdmin)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId);
        if (attempt == null)
            return null;
        if (!isAdmin && attempt.UserId != userId)
            return null;

        var quiz = attempt.Quiz;
        var answers = attempt.Answers.ToList();

        return new AttemptReviewDto
        {
            Id = attempt.Id,
            UserId = attempt.UserId,
            QuizId = attempt.QuizId,
            QuizTitle = quiz?.Title ?? "",
            StartTime = attempt.StartTime,
            EndTime = attempt.EndTime,
            Score = attempt.Score,
            MaxScore = attempt.MaxScore,
            QuestionCount = attempt.QuestionCount,
            Status = attempt.Status,
            AnswerReview = answers.Select(a => new AttemptAnswerReviewDto
            {
                Id = a.Id,
                AttemptId = a.AttemptId,
                QuizQuestionId = a.QuizQuestionId,
                QuestionSnapshotJson = a.QuestionSnapshotJson,
                AnswerJson = a.AnswerJson,
                IsCorrect = a.IsCorrect ?? false
            }).ToList()
        };
    }

    public async Task<IEnumerable<AttemptDto>> GetUserAttemptsForQuizAsync(int quizId, int userId)
    {
        var attempts = await _attemptRepository.GetAttemptsByQuizAndUserAsync(quizId, userId);
        return attempts.Select(MapToDto);
    }

    private AttemptDto MapToDto(QuizAttempt attempt)
    {
        return new AttemptDto
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
                IsCorrect = a.IsCorrect
            }).ToList()
        };
    }

    private bool EvaluateAnswer(string questionSnapshotJson, string answerJson)
    {
        try
        {
            using var qDoc = JsonDocument.Parse(questionSnapshotJson);
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
                "flashcard" => false, // should not be called
                _ => false
            };
        }
        catch
        {
            return false;
        }
    }

    private bool EvaluateMultipleChoice(JsonElement q, JsonElement a)
    {
        var metadata = q.GetProperty("metadata");

        // Support both "correctAnswers" and legacy "correct"
        JsonElement correctEl;
        if (!metadata.TryGetProperty("correctAnswers", out correctEl))
            correctEl = metadata.GetProperty("correct");

        // IDs are stored as strings in this quiz format ("0", "1", "2"...)
        var correctIds = correctEl.EnumerateArray()
            .Select(x => x.ValueKind == JsonValueKind.String
                ? x.GetString() ?? ""
                : x.GetInt32().ToString())
            .ToHashSet();

        var selectedIds = a.GetProperty("selected").EnumerateArray()
            .Select(x => x.ValueKind == JsonValueKind.String
                ? x.GetString() ?? ""
                : x.GetInt32().ToString())
            .ToHashSet();

        return correctIds.SetEquals(selectedIds);
    }

    private bool EvaluateSingleChoice(JsonElement q, JsonElement a)
    {
        var metadata = q.GetProperty("metadata");

        JsonElement correctEl;
        if (!metadata.TryGetProperty("correctAnswers", out correctEl))
            correctEl = metadata.GetProperty("correct");

        var correctId = correctEl[0].ValueKind == JsonValueKind.String
            ? correctEl[0].GetString() ?? ""
            : correctEl[0].GetInt32().ToString();

        var selectedId = a.GetProperty("selected").ValueKind == JsonValueKind.String
            ? a.GetProperty("selected").GetString() ?? ""
            : a.GetProperty("selected").GetInt32().ToString();

        return correctId == selectedId;
    }

    private bool EvaluateTrueFalse(JsonElement q, JsonElement a)
    {
        var metadata = q.GetProperty("metadata");

        // Support both "correctAnswer" (singular) and legacy "correct"
        JsonElement correctEl;
        if (!metadata.TryGetProperty("correctAnswer", out correctEl))
            correctEl = metadata.GetProperty("correct");

        var correct = correctEl.GetBoolean();

        // Answer "selected" can be boolean true/false or string "true"/"false"
        var selectedEl = a.GetProperty("selected");
        bool selected = selectedEl.ValueKind == JsonValueKind.True ? true
                      : selectedEl.ValueKind == JsonValueKind.False ? false
                      : bool.Parse(selectedEl.GetString() ?? "false");

        return correct == selected;
    }

    private bool EvaluateFillBlank(JsonElement q, JsonElement a)
    {
        var metadata = q.GetProperty("metadata");

        // Support both "keywords" (current) and legacy "answers"
        JsonElement answersEl;
        if (!metadata.TryGetProperty("keywords", out answersEl))
            answersEl = metadata.GetProperty("answers");

        var correctAnswers = answersEl.EnumerateArray()
            .Select(x => x.GetString()?.Trim().ToLowerInvariant() ?? "")
            .ToHashSet();

        var userAnswer = a.GetProperty("answer").GetString()?.Trim().ToLowerInvariant() ?? "";

        return correctAnswers.Contains(userAnswer);
    }

    private bool EvaluateOrdering(JsonElement q, JsonElement a)
    {
        var metadata = q.GetProperty("metadata");

        // If no correct_order, correct order = items sorted by order_id ascending
        List<int> correctOrder;
        if (metadata.TryGetProperty("correct_order", out JsonElement correctOrderEl))
        {
            correctOrder = correctOrderEl.EnumerateArray()
                .Select(x => x.GetInt32()).ToList();
        }
        else
        {
            // Build correct order from items sorted by order_id
            correctOrder = metadata.GetProperty("items").EnumerateArray()
                .OrderBy(item => item.GetProperty("order_id").GetInt32())
                .Select(item => item.GetProperty("order_id").GetInt32())
                .ToList();
        }

        var userOrder = a.GetProperty("order").EnumerateArray()
            .Select(x => x.GetInt32()).ToList();

        return correctOrder.SequenceEqual(userOrder);
    }

    private bool EvaluateMatching(JsonElement q, JsonElement a)
    {
        // Snapshot: { "metadata": { "pairs": [{ "id": 1, "left": "HTTP", "right": "80" }] } }
        // Answer:   { "matches": [{ "leftId": 1, "rightId": 1 }] }
        // A match is correct when leftId == rightId (same pair id)

        var pairs = q.GetProperty("metadata").GetProperty("pairs").EnumerateArray().ToList();
        var totalPairs = pairs.Count;

        var matches = a.GetProperty("matches").EnumerateArray().ToList();
        if (matches.Count != totalPairs) return false;

        int correctCount = 0;
        foreach (var match in matches)
        {
            var leftId = match.GetProperty("leftId").GetInt32();
            var rightId = match.GetProperty("rightId").GetInt32();
            // Correct when left and right refer to the same pair
            if (leftId == rightId) correctCount++;
        }

        return correctCount == totalPairs;
    }
}