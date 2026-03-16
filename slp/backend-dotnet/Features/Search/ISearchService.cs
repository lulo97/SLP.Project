namespace backend_dotnet.Features.Search;

public interface ISearchService
{
    /// <summary>
    ///   Execute a full-text search across quizzes, questions, sources, and / or
    ///   favorites for the given authenticated user.
    /// </summary>
    /// <param name="request">Query parameters (q, type, page, pageSize).</param>
    /// <param name="userId">
    ///   ID of the authenticated user.
    ///   Used to scope private content (own quizzes, questions, sources, favorites)
    ///   while still returning public quizzes from other users.
    /// </param>
    Task<SearchResponse> SearchAsync(SearchRequest request, int userId);
}
