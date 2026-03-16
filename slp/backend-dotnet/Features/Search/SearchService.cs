using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Search;

/// <summary>
///   Implements full-text search using PostgreSQL's built-in FTS engine.
///
///   Implementation notes
///   ────────────────────
///   • plainto_tsquery is used instead of to_tsquery because it is safe for raw
///     user input — no special operator syntax is accepted so malformed queries
///     never raise an exception.
///   • ts_headline wraps matched lexemes in &lt;mark&gt;…&lt;/mark&gt; so the frontend
///     can apply CSS highlight without parsing.
///   • COUNT(*) OVER() (window function) returns the total matching row count in
///     the same database round-trip as the paged data, avoiding a separate COUNT
///     query.
///   • Tag-name matching uses a simple ILIKE '%term%' sub-select so that short
///     words not present in English FTS dictionaries (stop words, abbreviations)
///     are still found when they are used as tags.
///   • NOTE: The quiz table currently has no GIN index for FTS. With ~1 000 users
///     a sequential scan is acceptable. For larger datasets add:
///       CREATE INDEX idx_quiz_fts ON quiz
///         USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'')));
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
        var q        = (req.Q ?? string.Empty).Trim();
        var page     = Math.Max(1, req.Page);
        var pageSize = Math.Clamp(req.PageSize, 1, 50);
        var offset   = (page - 1) * pageSize;
        var type     = ValidTypes.Contains(req.Type ?? "all")
                         ? req.Type!.ToLowerInvariant()
                         : "all";

        // Require at least one non-whitespace character
        if (q.Length == 0)
        {
            return new SearchResponse
            {
                Query = q, Type = type, Page = page, PageSize = pageSize,
                TotalCount = 0, TotalPages = 0,
                Results = new List<SearchResultItem>()
            };
        }

        return type switch
        {
            "quiz"     => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "quiz"),
            "question" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "question"),
            "source"   => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "source"),
            "favorite" => await SearchSingleTypeAsync(q, userId, page, pageSize, offset, "favorite"),
            _          => await SearchAllAsync(q, userId, pageSize),
        };
    }

    // ── Single-type search (with proper pagination) ──────────────────────────

    private async Task<SearchResponse> SearchSingleTypeAsync(
        string q, int userId, int page, int pageSize, int offset, string type)
    {
        var (items, totalCount) = type switch
        {
            "quiz"     => await SearchQuizzesAsync(q, userId, offset, pageSize),
            "question" => await SearchQuestionsAsync(q, userId, offset, pageSize),
            "source"   => await SearchSourcesAsync(q, userId, offset, pageSize),
            "favorite" => await SearchFavoritesAsync(q, userId, offset, pageSize),
            _          => (new List<SearchResultItem>(), 0),
        };

        return new SearchResponse
        {
            Query      = q,
            Type       = type,
            Page       = page,
            PageSize   = pageSize,
            TotalCount = totalCount,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize),
            Results    = items,
        };
    }

    // ── "All" search: fetch up to pageSize from each category, merge by rank ─

    private async Task<SearchResponse> SearchAllAsync(string q, int userId, int pageSize)
    {
        // Run sequentially — DbContext is not thread-safe for concurrent async calls.
        var (quizItems,     quizCount)     = await SearchQuizzesAsync(q, userId, 0, pageSize);
        var (questionItems, questionCount) = await SearchQuestionsAsync(q, userId, 0, pageSize);
        var (sourceItems,   sourceCount)   = await SearchSourcesAsync(q, userId, 0, pageSize);
        var (favoriteItems, favoriteCount) = await SearchFavoritesAsync(q, userId, 0, pageSize);

        var merged = quizItems
            .Concat(questionItems)
            .Concat(sourceItems)
            .Concat(favoriteItems)
            .OrderByDescending(r => r.Rank)
            .Take(pageSize)
            .ToList();

        var totalCount = quizCount + questionCount + sourceCount + favoriteCount;

        return new SearchResponse
        {
            Query      = q,
            Type       = "all",
            Page       = 1,
            PageSize   = pageSize,
            TotalCount = totalCount,
            // For "all" mode there is no deeper pagination; callers should narrow the type.
            TotalPages = 1,
            Results    = merged,
            CategoryCounts = new CategoryCounts
            {
                Quizzes   = quizCount,
                Questions = questionCount,
                Sources   = sourceCount,
                Favorites = favoriteCount,
            },
        };
    }

    // ── Per-category search methods ──────────────────────────────────────────

    /// <remarks>
    ///   Searches public quizzes and the user's own private quizzes.
    ///   Matches on title, description, and tag names.
    /// </remarks>
    private async Task<(List<SearchResultItem>, int)> SearchQuizzesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var rows = await _context.Database
                .SqlQuery<QuizSearchRow>($"""
                    SELECT
                        q.id                                                    AS "Id",
                        q.title                                                 AS "Title",
                        q.visibility                                            AS "Visibility",
                        q.created_at                                            AS "CreatedAt",
                        ts_rank(
                            to_tsvector('english',
                                q.title || ' ' || COALESCE(q.description, '')),
                            plainto_tsquery('english', {q})
                        )                                                       AS "Rank",
                        ts_headline(
                            'english',
                            COALESCE(q.description, q.title),
                            plainto_tsquery('english', {q}),
                            'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
                        )                                                       AS "Snippet",
                        COUNT(*) OVER()::int                                    AS "TotalCount"
                    FROM quiz q
                    WHERE q.disabled = false
                      AND (q.visibility = 'public' OR q.user_id = {userId})
                      AND (
                            to_tsvector('english',
                                q.title || ' ' || COALESCE(q.description, ''))
                            @@ plainto_tsquery('english', {q})
                          OR EXISTS (
                                SELECT 1
                                FROM   quiz_tag qt
                                JOIN   tag      t  ON t.id = qt.tag_id
                                WHERE  qt.quiz_id = q.id
                                  AND  t.name ILIKE '%' || {q} || '%'
                            )
                      )
                    ORDER BY "Rank" DESC, q.created_at DESC
                    LIMIT {limit} OFFSET {offset}
                    """)
                .ToListAsync();

            if (rows.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var totalCount = rows[0].TotalCount;

            // Batch-load tags for all returned quiz IDs in a single query
            var quizIds  = rows.Select(r => r.Id).ToList();
            var tagLookup = (await _context.QuizTags
                .Where(qt => quizIds.Contains(qt.QuizId))
                .Select(qt => new { qt.QuizId, qt.Tag.Name })
                .ToListAsync())
                .ToLookup(x => x.QuizId, x => x.Name);

            var items = rows.Select(r => new SearchResultItem
            {
                ResultType = "quiz",
                Id         = r.Id,
                Title      = r.Title,
                Snippet    = r.Snippet,
                Rank       = r.Rank,
                Visibility = r.Visibility,
                CreatedAt  = r.CreatedAt,
                Tags       = tagLookup[r.Id].ToList(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching quizzes for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    /// <remarks>
    ///   Only returns questions belonging to the authenticated user.
    ///   Matches on question content, explanation text, and tag names.
    /// </remarks>
    private async Task<(List<SearchResultItem>, int)> SearchQuestionsAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var rows = await _context.Database
                .SqlQuery<QuestionSearchRow>($"""
                    SELECT
                        q.id                                                    AS "Id",
                        LEFT(q.content, 120)                                    AS "Title",
                        q.type                                                  AS "SubType",
                        q.created_at                                            AS "CreatedAt",
                        ts_rank(
                            to_tsvector('english',
                                q.content || ' ' || COALESCE(q.explanation, '')),
                            plainto_tsquery('english', {q})
                        )                                                       AS "Rank",
                        ts_headline(
                            'english',
                            q.content || ' ' || COALESCE(q.explanation, ''),
                            plainto_tsquery('english', {q}),
                            'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
                        )                                                       AS "Snippet",
                        COUNT(*) OVER()::int                                    AS "TotalCount"
                    FROM question q
                    WHERE q.user_id = {userId}
                      AND (
                            to_tsvector('english',
                                q.content || ' ' || COALESCE(q.explanation, ''))
                            @@ plainto_tsquery('english', {q})
                          OR EXISTS (
                                SELECT 1
                                FROM   question_tag qt
                                JOIN   tag          t  ON t.id = qt.tag_id
                                WHERE  qt.question_id = q.id
                                  AND  t.name ILIKE '%' || {q} || '%'
                            )
                      )
                    ORDER BY "Rank" DESC, q.created_at DESC
                    LIMIT {limit} OFFSET {offset}
                    """)
                .ToListAsync();

            if (rows.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var totalCount   = rows[0].TotalCount;
            var questionIds  = rows.Select(r => r.Id).ToList();

            var tagLookup = (await _context.QuestionTags
                .Where(qt => questionIds.Contains(qt.QuestionId))
                .Select(qt => new { qt.QuestionId, qt.Tag.Name })
                .ToListAsync())
                .ToLookup(x => x.QuestionId, x => x.Name);

            var items = rows.Select(r => new SearchResultItem
            {
                ResultType = "question",
                Id         = r.Id,
                Title      = r.Title,
                Snippet    = r.Snippet,
                Rank       = r.Rank,
                SubType    = r.SubType,
                CreatedAt  = r.CreatedAt,
                Tags       = tagLookup[r.Id].ToList(),
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching questions for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    /// <remarks>
    ///   Only returns non-deleted sources belonging to the authenticated user.
    ///   Matches on title and raw_text.
    ///   raw_text can be large, so ts_headline is applied only to the title + first
    ///   2 000 characters of raw_text to keep the query fast.
    /// </remarks>
    private async Task<(List<SearchResultItem>, int)> SearchSourcesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var rows = await _context.Database
                .SqlQuery<SourceSearchRow>($"""
                    SELECT
                        s.id                                                    AS "Id",
                        s.title                                                 AS "Title",
                        s.type                                                  AS "SubType",
                        s.created_at                                            AS "CreatedAt",
                        ts_rank(
                            to_tsvector('english',
                                s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), '')),
                            plainto_tsquery('english', {q})
                        )                                                       AS "Rank",
                        ts_headline(
                            'english',
                            s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), ''),
                            plainto_tsquery('english', {q}),
                            'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
                        )                                                       AS "Snippet",
                        COUNT(*) OVER()::int                                    AS "TotalCount"
                    FROM source s
                    WHERE s.user_id = {userId}
                      AND s.deleted_at IS NULL
                      AND to_tsvector('english',
                              s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), ''))
                          @@ plainto_tsquery('english', {q})
                    ORDER BY "Rank" DESC, s.created_at DESC
                    LIMIT {limit} OFFSET {offset}
                    """)
                .ToListAsync();

            if (rows.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var totalCount = rows[0].TotalCount;
            var items = rows.Select(r => new SearchResultItem
            {
                ResultType = "source",
                Id         = r.Id,
                Title      = r.Title,
                Snippet    = r.Snippet,
                Rank       = r.Rank,
                SubType    = r.SubType,
                CreatedAt  = r.CreatedAt,
                Tags       = new List<string>(), // sources don't use tags
            }).ToList();

            return (items, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching sources for query '{Query}'", q);
            return (new List<SearchResultItem>(), 0);
        }
    }

    /// <remarks>
    ///   Only returns favorites belonging to the authenticated user.
    ///   Matches on the item text and its note field.
    /// </remarks>
    private async Task<(List<SearchResultItem>, int)> SearchFavoritesAsync(
        string q, int userId, int offset, int limit)
    {
        try
        {
            var rows = await _context.Database
                .SqlQuery<FavoriteSearchRow>($"""
                    SELECT
                        fi.id                                                   AS "Id",
                        fi.text                                                 AS "Title",
                        fi.type                                                 AS "SubType",
                        fi.created_at                                           AS "CreatedAt",
                        ts_rank(
                            to_tsvector('english',
                                fi.text || ' ' || COALESCE(fi.note, '')),
                            plainto_tsquery('english', {q})
                        )                                                       AS "Rank",
                        ts_headline(
                            'english',
                            fi.text || ' ' || COALESCE(fi.note, ''),
                            plainto_tsquery('english', {q}),
                            'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
                        )                                                       AS "Snippet",
                        COUNT(*) OVER()::int                                    AS "TotalCount"
                    FROM favorite_item fi
                    WHERE fi.user_id = {userId}
                      AND to_tsvector('english',
                              fi.text || ' ' || COALESCE(fi.note, ''))
                          @@ plainto_tsquery('english', {q})
                    ORDER BY "Rank" DESC, fi.created_at DESC
                    LIMIT {limit} OFFSET {offset}
                    """)
                .ToListAsync();

            if (rows.Count == 0)
                return (new List<SearchResultItem>(), 0);

            var totalCount = rows[0].TotalCount;
            var items = rows.Select(r => new SearchResultItem
            {
                ResultType = "favorite",
                Id         = r.Id,
                Title      = r.Title,
                Snippet    = r.Snippet,
                Rank       = r.Rank,
                SubType    = r.SubType,
                CreatedAt  = r.CreatedAt,
                Tags       = new List<string>(),
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
