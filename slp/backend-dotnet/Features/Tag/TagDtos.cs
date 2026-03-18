namespace backend_dotnet.Features.Tag;

public class TagDto
{
    public int    Id            { get; set; }
    public string Name          { get; set; } = string.Empty;
    public int    QuizCount     { get; set; }
    public int    QuestionCount { get; set; }

    /// <summary>QuizCount + QuestionCount — drives tag-cloud weight.</summary>
    public int TotalCount { get; set; }
}

public class TagListResponse
{
    public List<TagDto> Tags  { get; set; } = new();
    /// <summary>Total tags in the result set (≤ requested limit).</summary>
    public int          Total { get; set; }
}
