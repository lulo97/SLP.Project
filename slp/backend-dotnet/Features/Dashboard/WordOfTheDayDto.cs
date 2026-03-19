namespace backend_dotnet.Features.Dashboard;

public class WordOfTheDayDto
{
    public string Word { get; set; } = string.Empty;
    public string PartOfSpeech { get; set; } = string.Empty;
    public string VietnameseTranslation { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;
    public string? Origin { get; set; }
    public string? FunFact { get; set; }
}

public class TopQuizDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AuthorUsername { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public int CommentCount { get; set; }
    public int QuestionCount { get; set; }
}

public class UserStatsDto
{
    public int QuizCount { get; set; }
    public int QuestionCount { get; set; }
    public int SourceCount { get; set; }
    public int FavoriteCount { get; set; }
}