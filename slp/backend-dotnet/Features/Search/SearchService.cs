using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Search;

/// <summary>
///   Simple search using ILIKE (case‑insensitive substring match) on:
///     - Quizzes   → title
///     - Questions → content
///     - Sources   → title
///     - Favorites → text
/// </summary>
public class SearchService : ISearchService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SearchService> _logger;

    private static readonly HashSet<string> ValidTypes =
        new(StringComparer.OrdinalIgnoreCase) { "all", "quiz", "question", "source", "favorite" };

    public SearchService(AppDbContext context, ILogger<SearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Public entry point ───────────────────────────────────────────────────

    public async Task<SearchResponse> SearchAsync(SearchRequest req, int userId)
    {
        var q = (req.Q ?? string.Empty).Trim();
        var page = Math.Max(1, req.Page);
        var pageSize = Math.Clamp(req.PageSize, 1, 50);
        var offset = (page - 1) * pageSize;
        var type = ValidTypes.Contains(req.Type ?? "all")
                         ? req.Type!.ToLowerInvariant()
                         : "all";

        if (q.Length == 0)
        {
            return new SearchResponse
            {
                Query = q,
                Type = type,
                Page = page,
                PageSize = pageSize,
                TotalCount = 0,
                TotalPages = 0,
                Results = new List<SearchResultItem>()
            };
        }

        return type switch
        {
            "quiz" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "quiz"),
            "question" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "question"),
            "source" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "source"),
            "favorite" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "favorite"),
            _ => await SearchAllAsync(q, userId, pageSize),
        };
    }

    // ── Single-type search (with pagination) ─────────────────────────────────

    private async Task<SearchResponse> SearchSingleTypeAsync(
        string q, int userId, int page, int pageSize, int offset, string type)
    {
        var (items, totalCount) = type switch
        {
            "quiz" => await SearchQuizzesAsync(q, userId, offset, pageSize),
            "question" => await SearchQuestionsAsync(q, userId, offset, pageSize),
            "source" => await SearchSourcesAsync(q, userId, offset, pageSize),
            "favorite" => await SearchFavoritesAsync(q, userId, offset, pageSize),
            _ => (new List<SearchResultItem>(), 0),
        };

        return new SearchResponse
        {
            Query = q,
            Type = type,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize),
            Results = items,
        };
    }

    // ── "All" search: fetch up to pageSize from each category, merge by rank ─
    //    (Rank is now a simple 1.0 for all matches – ordering is by created_at desc)

    private async Task<SearchResponse> SearchAllAsync(string q, int userId, int pageSize)
    {
        var (quizItems, quizCount) = await SearchQuizzesAsync(q, userId, 0, pageSize);
        var (questionItems, questionCount) = await SearchQuestionsAsync(q, userId, 0, pageSize);
        var (sourceItems, sourceCount) = await SearchSourcesAsync(q, userId, 0, pageSize);
        var (favoriteItems, favoriteCount) = await SearchFavoritesAsync(q, userId, 0, pageSize);

        // Merge and sort by most recent first (no rank scoring)
        var merged = quizItems
            .Concat(questionItems)
            .Concat(sourceItems)
            .Concat(favoriteItems)
            .OrderByDescending(r => r.CreatedAt)
            .Take(pageSize)
            .ToList();

        var totalCount = quizCount + questionCount + sourceCount + favoriteCount;

        return new SearchResponse
        {
            Query = q,
            Type = "all",
            Page = 1,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = 1,
            Results = merged,
            CategoryCounts = new CategoryCounts
            {
                Quizzes = quizCount,
                Questions = questionCount,
                Sources = sourceCount,
                Favorites = favoriteCount,
            },
        };
    }

    // ── Per-category search methods (simple ILIKE) ───────────────────────────

    private async Task<(List<SearchResultItem>, int)> SearchQuizzesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            // Build the pattern for ILIKE
            var pattern = $"%{q}%";

            var query = _context.Quizzes
                .Where(quiz => !quiz.Disabled &&
                               (quiz.Visibility == "public" || quiz.UserId == userId) &&
                               EF.Functions.ILike(quiz.Title, pattern))
                .OrderByDescending(quiz => quiz.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(quiz => new
                {
                    quiz.Id,
                    quiz.Title,
                    quiz.Visibility,
                    quiz.CreatedAt,
                    Snippet = quiz.Title.Length > 200
                        ? quiz.Title.Substring(0, 200) + "..."
                        : quiz.Title
                });

            var itemsList = await query.ToListAsync();

            // Get total count separately (EF Core doesn't support COUNT(*) OVER() easily with Skip/Take)
            var totalCount = await _context.Quizzes
                .Where(quiz => !quiz.Disabled &&
                               (quiz.Visibility == "public" || quiz.UserId == userId) &&
                               EF.Functions.ILike(quiz.Title, pattern))
                .CountAsync();

            if (itemsList.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var quizIds = itemsList.Select(x => x.Id).ToList();

            // Load tags for display
            var tagLookup = (await _context.QuizTags
                .Where(qt => quizIds.Contains(qt.QuizId))
                .Select(qt => new { qt.QuizId, qt.Tag.Name })
                .ToListAsync())
                .ToLookup(x => x.QuizId, x => x.Name);

            var items = itemsList.Select(r => new SearchResultItem
            {
                ResultType = "quiz",
                Id = r.Id,
                Title = r.Title,
                Snippet = r.Snippet,
                Rank = 1.0,          // no relevance scoring
                Visibility = r.Visibility,
                CreatedAt = r.CreatedAt,
                Tags = tagLookup[r.Id].ToList(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching quizzes for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    private async Task<(List<SearchResultItem>, int)> SearchQuestionsAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var pattern = $"%{q}%";

            var query = _context.Questions
                .Where(question => question.UserId == userId &&
                                   EF.Functions.ILike(question.Content, pattern))
                .OrderByDescending(question => question.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(question => new
                {
                    question.Id,
                    Title = question.Content.Length > 120
                        ? question.Content.Substring(0, 120)
                        : question.Content,
                    question.Type,
                    question.CreatedAt,
                    Snippet = question.Content.Length > 200
                        ? question.Content.Substring(0, 200) + "..."
                        : question.Content
                });

            var itemsList = await query.ToListAsync();

            var totalCount = await _context.Questions
                .Where(question => question.UserId == userId &&
                                   EF.Functions.ILike(question.Content, pattern))
                .CountAsync();

            if (itemsList.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var questionIds = itemsList.Select(x => x.Id).ToList();

            var tagLookup = (await _context.QuestionTags
                .Where(qt => questionIds.Contains(qt.QuestionId))
                .Select(qt => new { qt.QuestionId, qt.Tag.Name })
                .ToListAsync())
                .ToLookup(x => x.QuestionId, x => x.Name);

            var items = itemsList.Select(r => new SearchResultItem
            {
                ResultType = "question",
                Id = r.Id,
                Title = r.Title,
                Snippet = r.Snippet,
                Rank = 1.0,
                SubType = r.Type,
                CreatedAt = r.CreatedAt,
                Tags = tagLookup[r.Id].ToList(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching questions for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    private async Task<(List<SearchResultItem>, int)> SearchSourcesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var pattern = $"%{q}%";

            var query = _context.Sources
                .Where(source => source.UserId == userId &&
                                 source.DeletedAt == null &&
                                 EF.Functions.ILike(source.Title, pattern))
                .OrderByDescending(source => source.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(source => new
                {
                    source.Id,
                    source.Title,
                    source.Type,
                    source.CreatedAt,
                    Snippet = source.Title.Length > 200
                        ? source.Title.Substring(0, 200) + "..."
                        : source.Title
                });

            var itemsList = await query.ToListAsync();

            var totalCount = await _context.Sources
                .Where(source => source.UserId == userId &&
                                 source.DeletedAt == null &&
                                 EF.Functions.ILike(source.Title, pattern))
                .CountAsync();

            if (itemsList.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var items = itemsList.Select(r => new SearchResultItem
            {
                ResultType = "source",
                Id = r.Id,
                Title = r.Title,
                Snippet = r.Snippet,
                Rank = 1.0,
                SubType = r.Type,
                CreatedAt = r.CreatedAt,
                Tags = new List<string>(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching sources for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    private async Task<(List<SearchResultItem>, int)> SearchFavoritesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var pattern = $"%{q}%";

            var query = _context.FavoriteItems
                .Where(fav => fav.UserId == userId &&
                              EF.Functions.ILike(fav.Text, pattern))
                .OrderByDescending(fav => fav.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(fav => new
                {
                    fav.Id,
                    fav.Text,
                    fav.Type,
                    fav.CreatedAt,
                    Snippet = fav.Text.Length > 200
                        ? fav.Text.Substring(0, 200) + "..."
                        : fav.Text
                });

            var itemsList = await query.ToListAsync();

            var totalCount = await _context.FavoriteItems
                .Where(fav => fav.UserId == userId &&
                              EF.Functions.ILike(fav.Text, pattern))
                .CountAsync();

            if (itemsList.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var items = itemsList.Select(r => new SearchResultItem
            {
                ResultType = "favorite",
                Id = r.Id,
                Title = r.Text,
                Snippet = r.Snippet,
                Rank = 1.0,
                SubType = r.Type,
                CreatedAt = r.CreatedAt,
                Tags = new List<string>(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching favorites for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }
}