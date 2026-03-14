using System;
using System.Collections.Generic;

namespace backend_dotnet.Features.QuizAttempt;

public class AttemptDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int QuizId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? Score { get; set; }
    public int MaxScore { get; set; }
    public int QuestionCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<AttemptAnswerDto>? Answers { get; set; }
}

public class AttemptAnswerDto
{
    public int Id { get; set; }
    public int AttemptId { get; set; }
    public int QuizQuestionId { get; set; }
    public string QuestionSnapshotJson { get; set; } = string.Empty;
    public string AnswerJson { get; set; } = string.Empty;
    public bool? IsCorrect { get; set; }
}

public class StartAttemptResponseDto
{
    public int AttemptId { get; set; }
    public DateTime StartTime { get; set; }
    public int QuestionCount { get; set; }
    public int MaxScore { get; set; }
    public List<AttemptQuestionDto> Questions { get; set; } = new();
}

public class AttemptQuestionDto
{
    public int QuizQuestionId { get; set; }
    public int DisplayOrder { get; set; }
    public string QuestionSnapshotJson { get; set; } = string.Empty;
}

public class SubmitAnswerDto
{
    public int QuizQuestionId { get; set; }
    public string AnswerJson { get; set; } = string.Empty;
}

public class SubmitAttemptDto
{
    // empty for now, maybe later add flags
}

public class AttemptReviewDto : AttemptDto
{
    public string QuizTitle { get; set; } = string.Empty;
    public List<AttemptAnswerReviewDto> AnswerReview { get; set; } = new();
}

public class AttemptAnswerReviewDto : AttemptAnswerDto
{
    public bool IsCorrect { get; set; }
    // Could also include correct answer snapshot for display
}