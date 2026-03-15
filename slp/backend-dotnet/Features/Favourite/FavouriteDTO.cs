namespace backend_dotnet.Features.Favorite;

public class FavoriteDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateFavoriteRequest
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "word";
    public string? Note { get; set; }
}

public class UpdateFavoriteRequest
{
    public string? Text { get; set; }
    public string? Type { get; set; }
    public string? Note { get; set; }
}