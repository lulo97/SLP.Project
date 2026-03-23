using System;
using System.Collections.Generic;

namespace backend_dotnet.Features.Quiz;

public class QuizDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Visibility { get; set; } = string.Empty;
    public bool Disabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public int QuestionCount { get; set; }
    public string? UserName { get; set; }
}

public class QuizListDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UserId { get; set; }
    public string Visibility { get; set; } = string.Empty;
    public bool Disabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public int QuestionCount { get; set; }
    public string? UserName { get; set; }
}

public class CreateQuizDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Visibility { get; set; }
    public List<string>? TagNames { get; set; }
}

public class UpdateQuizDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Visibility { get; set; }
    public List<string>? TagNames { get; set; }
    public bool? Disabled { get; set; }   // <-- added
}

public class AddSourceToQuizDto
{
    public int SourceId { get; set; }
}

public class QuizSearchDto
{
    public string? SearchTerm { get; set; }
    public int? UserId { get; set; }
    public string? Visibility { get; set; }   // "public", "unlisted", etc.
    public bool IncludeDisabled { get; set; }
    public string? SortBy { get; set; }        // "createdAt", "title"
    public string? SortOrder { get; set; }     // "asc", "desc"
}