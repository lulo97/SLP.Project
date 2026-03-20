using System;
using System.Collections.Generic;

namespace backend_dotnet.Features.Question;

public class QuestionDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public string? UserName { get; set; }
}

public class QuestionListDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public string? UserName { get; set; }
    public string? MetadataJson { get; set; }
}

public class CreateQuestionDto
{
    public string Type { get; set; } = "multiple_choice";
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? MetadataJson { get; set; }
    public List<string>? TagNames { get; set; }
}

public class UpdateQuestionDto
{
    public string? Type { get; set; }
    public string? Content { get; set; }
    public string? Explanation { get; set; }
    public string? MetadataJson { get; set; }
    public List<string>? TagNames { get; set; }
}

public class QuestionSearchDto
{
    public string? SearchTerm { get; set; }
    public string? Type { get; set; }
    public List<string>? Tags { get; set; }
    public int? UserId { get; set; }
}