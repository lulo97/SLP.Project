namespace backend_dotnet.Features.Search;

// ── Public request / response models ─────────────────────────────────────────

public class SearchRequest
{
    /// <summary>Full-text query string. Min 1 non-whitespace character.</summary>
    public string Q { get; set; } = string.Empty;

    /// <summary>Scope: all | quiz | question | source | favorite. Default: all.</summary>
    public string Type { get; set; } = "all";

    /// <summary>1-based page number. Default: 1.</summary>
    public int Page { get; set; } = 1;

    /// <summary>Items per page (1-50). Default: 20.</summary>
    public int PageSize { get; set; } = 20;
}

public class SearchResultItem
{
    /// <summary>Discriminator: quiz | question | source | favorite.</summary>
    public string ResultType { get; set; } = string.Empty;

    public int Id { get; set; }

    /// <summary>Display title. For questions this is the first 120 chars of content.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    ///   ts_headline excerpt with matched terms wrapped in &lt;mark&gt; tags.
    ///   May be null when the match was on a tag rather than body text.
    /// </summary>
    public string? Snippet { get; set; }

    /// <summary>ts_rank score (0.0 – 1.0). Used for cross-type sorting in "all" mode.</summary>
    public double Rank { get; set; }

    /// <summary>
    ///   Associated tag names.
    ///   Quizzes and questions carry tags; sources and favorites leave this empty.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    public DateTime CreatedAt { get; set; }

    /// <summary>
    ///   Type-specific sub-classification.
    ///   For questions: question type (multiple_choice, flashcard, …).
    ///   For sources: source type (pdf, link, note, …).
    ///   For favorites: item type (word, phrase, idiom, other).
    /// </summary>
    public string? SubType { get; set; }

    /// <summary>Quiz visibility (public | private). Present only for quiz results.</summary>
    public string? Visibility { get; set; }
}

public class SearchResponse
{
    public string Query { get; set; } = string.Empty;

    /// <summary>The resolved type used for the search (all | quiz | question | source | favorite).</summary>
    public string Type { get; set; } = string.Empty;

    public int Page { get; set; }
    public int PageSize { get; set; }

    /// <summary>
    ///   Total matching records.
    ///   For "all" this is the sum across all four categories (may exceed Results.Count).
    /// </summary>
    public int TotalCount { get; set; }

    public int TotalPages { get; set; }

    public List<SearchResultItem> Results { get; set; } = new();

    /// <summary>
    ///   Only populated for type = "all". Gives per-category match counts so the
    ///   frontend can show category badges / tabs.
    /// </summary>
    public CategoryCounts? CategoryCounts { get; set; }
}

public class CategoryCounts
{
    public int Quizzes { get; set; }
    public int Questions { get; set; }
    public int Sources { get; set; }
    public int Favorites { get; set; }
}

// ── Internal SQL projection types ────────────────────────────────────────────
//  Used only by SearchService when mapping raw SQL query results.
//  Column aliases in the SQL must match these property names (EF maps case-insensitively).

internal class QuizSearchRow
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Visibility { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double Rank { get; set; }
    public string? Snippet { get; set; }

    /// <summary>COUNT(*) OVER() – total rows matching the WHERE clause.</summary>
    public int TotalCount { get; set; }
}

internal class QuestionSearchRow
{
    public int Id { get; set; }

    /// <summary>LEFT(content, 120) used as a display title.</summary>
    public string Title { get; set; } = string.Empty;

    public string SubType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double Rank { get; set; }
    public string? Snippet { get; set; }
    public int TotalCount { get; set; }
}

internal class SourceSearchRow
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string SubType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double Rank { get; set; }
    public string? Snippet { get; set; }
    public int TotalCount { get; set; }
}

internal class FavoriteSearchRow
{
    public int Id { get; set; }

    /// <summary>The favorite text field, used directly as title.</summary>
    public string Title { get; set; } = string.Empty;

    public string SubType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double Rank { get; set; }
    public string? Snippet { get; set; }
    public int TotalCount { get; set; }
}
