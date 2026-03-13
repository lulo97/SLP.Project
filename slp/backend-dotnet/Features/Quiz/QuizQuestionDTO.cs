using System;

namespace backend_dotnet.Features.Quiz;

public class QuizQuestionDto
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public int? OriginalQuestionId { get; set; }
    public string? QuestionSnapshotJson { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateQuizQuestionDto
{
    public int? OriginalQuestionId { get; set; }
    public string? QuestionSnapshotJson { get; set; }
    public int DisplayOrder { get; set; }
}

public class UpdateQuizQuestionDto
{
    public int? OriginalQuestionId { get; set; }
    public string? QuestionSnapshotJson { get; set; }
    public int? DisplayOrder { get; set; }
}