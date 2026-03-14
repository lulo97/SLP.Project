using backend_dotnet.Features.Quiz;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

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
        // Expected snapshot: { "metadata": { "correct": [id1, id2] } }
        // Answer format: { "selected": [id1, id2] }  (array of selected option ids)
        var correctIds = q.GetProperty("metadata").GetProperty("correct").EnumerateArray()
            .Select(x => x.GetInt32()).ToHashSet();
        var selectedIds = a.GetProperty("selected").EnumerateArray()
            .Select(x => x.GetInt32()).ToHashSet();
        return correctIds.SetEquals(selectedIds);
    }

    private bool EvaluateSingleChoice(JsonElement q, JsonElement a)
    {
        // Expected snapshot: { "metadata": { "correct": [id] } } (array with one id)
        // Answer format: { "selected": id } (single integer)
        var correctId = q.GetProperty("metadata").GetProperty("correct")[0].GetInt32();
        var selectedId = a.GetProperty("selected").GetInt32();
        return correctId == selectedId;
    }

    private bool EvaluateTrueFalse(JsonElement q, JsonElement a)
    {
        // Snapshot: { "metadata": { "correct": true } }
        // Answer: { "selected": true }
        var correct = q.GetProperty("metadata").GetProperty("correct").GetBoolean();
        var selected = a.GetProperty("selected").GetBoolean();
        return correct == selected;
    }

    private bool EvaluateFillBlank(JsonElement q, JsonElement a)
    {
        // Snapshot: { "metadata": { "answers": ["answer1", "answer2"] } } (case‑insensitive)
        // Answer: { "answer": "user input" }
        var correctAnswers = q.GetProperty("metadata").GetProperty("answers").EnumerateArray()
            .Select(x => x.GetString()?.Trim().ToLowerInvariant() ?? "").ToHashSet();
        var userAnswer = a.GetProperty("answer").GetString()?.Trim().ToLowerInvariant() ?? "";
        return correctAnswers.Contains(userAnswer);
    }

    private bool EvaluateOrdering(JsonElement q, JsonElement a)
    {
        // Snapshot: { "metadata": { "correct_order": [2,1,3] } } (list of item indices in correct order)
        // Answer: { "order": [2,1,3] }
        var correctOrder = q.GetProperty("metadata").GetProperty("correct_order").EnumerateArray()
            .Select(x => x.GetInt32()).ToList();
        var userOrder = a.GetProperty("order").EnumerateArray()
            .Select(x => x.GetInt32()).ToList();
        return correctOrder.SequenceEqual(userOrder);
    }

    private bool EvaluateMatching(JsonElement q, JsonElement a)
    {
        // Snapshot: { "metadata": { "pairs": [{ "left": "A", "right": "1" }] } }
        // Answer: { "matches": { "0": 2, "1": 0 } }  (left index -> right index)
        // We'll assume each left has exactly one correct right index.
        var pairs = q.GetProperty("metadata").GetProperty("pairs").EnumerateArray().ToList();
        var correctMap = new Dictionary<int, int>();
        for (int i = 0; i < pairs.Count; i++)
        {
            // The correct right index is the index of the matching right item.
            // For simplicity, we assume the right items are in the same order as they appear in the pairs.
            // The correct mapping is left index i to right index i (if order matches). But the design may allow shuffling.
            // Here we'll use the order in the pairs array: left i matches right i.
            correctMap[i] = i;
        }

        var userMatches = a.GetProperty("matches").EnumerateObject()
            .ToDictionary(p => int.Parse(p.Name), p => p.Value.GetInt32());

        if (userMatches.Count != correctMap.Count) return false;

        foreach (var kv in correctMap)
        {
            if (!userMatches.TryGetValue(kv.Key, out int userRight) || userRight != kv.Value)
                return false;
        }
        return true;
    }
}