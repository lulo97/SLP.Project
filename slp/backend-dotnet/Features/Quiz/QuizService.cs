using backend_dotnet.Features.Helpers;
using backend_dotnet.Features.Note;
using backend_dotnet.Features.Source;
using backend_dotnet.Features.Tag;
using backend_dotnet.Helpers;          
using System.Text.Json;

namespace backend_dotnet.Features.Quiz;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepository;
    private readonly ITagRepository _tagRepository;
    private readonly ISourceRepository _sourceRepository;

    public QuizService(IQuizRepository quizRepository, ITagRepository tagRepository, ISourceRepository sourceRepository)
    {
        _quizRepository = quizRepository;
        _tagRepository = tagRepository;
        _sourceRepository = sourceRepository;
    }

    public async Task<QuizDto?> GetQuizByIdAsync(int id, int? currentUserId)
    {
        // Fetch quiz even if disabled so that owner/admin can still see it
        var quiz = await _quizRepository.GetByIdAsync(id, includeDisabled: true);
        if (quiz == null)
            return null;

        // If disabled and not owner/admin, return null
        if (quiz.Disabled && quiz.UserId != currentUserId && !(currentUserId.HasValue && AdminHelper.IsAdmin(currentUserId.Value)))  // IsAdmin check would need to be passed or injected
            return null;

        // If private and not owner, return null
        if (quiz.Visibility == "private" && quiz.UserId != currentUserId)
            return null;

        return MapToDto(quiz);
    }

    public async Task<IEnumerable<QuizListDto>> GetUserQuizzesAsync(int userId)
    {
        var quizzes = await _quizRepository.GetUserQuizzesAsync(userId);
        return quizzes.Select(MapToListDto);
    }

    public async Task<IEnumerable<QuizListDto>> GetPublicQuizzesAsync(string? visibility = null)
    {
        var quizzes = await _quizRepository.GetPublicQuizzesAsync(visibility);
        return quizzes.Select(MapToListDto);
    }

    public async Task<QuizDto> CreateQuizAsync(int userId, CreateQuizDto dto)
    {
        var quiz = new Quiz
        {
            UserId = userId,
            Title = dto.Title,
            Description = dto.Description,
            Visibility = dto.Visibility ?? "private",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Handle tags
        if (dto.TagNames != null && dto.TagNames.Any())
        {
            var tags = await _tagRepository.GetOrCreateTagsAsync(dto.TagNames);
            quiz.QuizTags = tags.Select(t => new QuizTag { Tag = t }).ToList();
        }

        var created = await _quizRepository.CreateAsync(quiz);
        return MapToDto(created);
    }

    public async Task<QuizDto?> UpdateQuizAsync(int id, int userId, UpdateQuizDto dto)
    {
        // Fetch quiz, including disabled if the user is admin
        var includeDisabled = AdminHelper.IsAdmin(userId);
        var quiz = await _quizRepository.GetByIdAsync(id, includeDisabled);
        if (quiz == null)
            return null;

        // If not admin, must be owner
        if (!AdminHelper.IsAdmin(userId) && quiz.UserId != userId)
            return null;

        quiz.Title = dto.Title ?? quiz.Title;
        quiz.Description = dto.Description ?? quiz.Description;
        quiz.Visibility = dto.Visibility ?? quiz.Visibility;

        // Admin can change disabled status
        if (AdminHelper.IsAdmin(userId) && dto.Disabled.HasValue)
        {
            quiz.Disabled = dto.Disabled.Value;
        }

        // Update tags if provided
        if (dto.TagNames != null)
        {
            // Remove existing tags
            await _tagRepository.RemoveQuizTags(quiz.Id);
            var tags = await _tagRepository.GetOrCreateTagsAsync(dto.TagNames);
            quiz.QuizTags = tags.Select(t => new QuizTag { QuizId = quiz.Id, TagId = t.Id }).ToList();
        }

        await _quizRepository.UpdateAsync(quiz);
        return MapToDto(quiz);
    }

    public async Task<bool> DeleteQuizAsync(int id, int userId, bool isAdmin)
    {
        // Fetch including disabled so admins can delete disabled quizzes too.
        var quiz = await _quizRepository.GetByIdAsync(id, includeDisabled: true);
        if (quiz == null)
            return false;

        if (!isAdmin && quiz.UserId != userId)
            return false;

        // Hard delete — removes the row and cascades to quiz_question,
        // quiz_attempt, quiz_attempt_answer via FK ON DELETE CASCADE.
        await _quizRepository.HardDeleteAsync(id);
        return true;
    }

    public async Task<QuizDto?> DuplicateQuizAsync(int id, int userId)
    {
        var original = await _quizRepository.GetByIdAsync(id);
        if (original == null)
            return null;

        // Only allow duplication if public or owned by user
        if (original.Visibility != "public" && original.UserId != userId)
            return null;

        var clone = new Quiz
        {
            UserId = userId,
            Title = $"{original.Title} (Copy)",
            Description = original.Description,
            Visibility = "private", // default private
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Clone tags
        if (original.QuizTags != null)
        {
            clone.QuizTags = original.QuizTags.Select(qt => new QuizTag { TagId = qt.TagId }).ToList();
        }

        // Clone questions (snapshots)
        if (original.QuizQuestions != null)
        {
            clone.QuizQuestions = original.QuizQuestions.Select(qq => new QuizQuestion
            {
                OriginalQuestionId = qq.OriginalQuestionId,
                QuestionSnapshotJson = qq.QuestionSnapshotJson,
                DisplayOrder = qq.DisplayOrder
            }).ToList();
        }

        // Clone sources?
        if (original.QuizSources != null)
        {
            clone.QuizSources = original.QuizSources.Select(qs => new QuizSource { SourceId = qs.SourceId }).ToList();
        }

        var created = await _quizRepository.CreateAsync(clone);
        return MapToDto(created);
    }

    public async Task<PaginatedResult<QuizListDto>> SearchQuizzesAsync(QuizSearchDto search, int page, int pageSize)
    {
        var (items, totalCount) = await _quizRepository.SearchAsync(
            search.SearchTerm,
            search.UserId,
            search.Visibility,
            search.IncludeDisabled,
            search.SortBy,
            search.SortOrder,
            page,
            pageSize);

        return new PaginatedResult<QuizListDto>
        {
            Items = items.Select(MapToListDto).ToList(),
            Total = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private QuizDto MapToDto(Quiz quiz)
    {
        return new QuizDto
        {
            Id = quiz.Id,
            UserId = quiz.UserId,
            Title = quiz.Title,
            Description = quiz.Description,
            Visibility = quiz.Visibility,
            Disabled = quiz.Disabled,
            CreatedAt = quiz.CreatedAt,
            UpdatedAt = quiz.UpdatedAt,
            Tags = quiz.QuizTags?.Select(qt => qt.Tag?.Name ?? "").ToList() ?? new List<string>(),
            QuestionCount = quiz.QuizQuestions?.Count ?? 0,
            UserName = quiz.User?.Username
        };
    }

    private QuizListDto MapToListDto(Quiz quiz)
    {
        return new QuizListDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            UserId = quiz.UserId,
            Visibility = quiz.Visibility,
            Disabled = quiz.Disabled,
            CreatedAt = quiz.CreatedAt,
            UpdatedAt = quiz.UpdatedAt,
            Tags = quiz.QuizTags?.Select(qt => qt.Tag?.Name ?? "").ToList() ?? new List<string>(),
            QuestionCount = quiz.QuizQuestions?.Count ?? 0,
            UserName = quiz.User?.Username
        };
    }

    public async Task<IEnumerable<QuizQuestionDto>> GetQuizQuestionsAsync(int quizId, int? currentUserId)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            return new List<QuizQuestionDto>();

        // Check visibility
        if (quiz.Visibility == "private" && quiz.UserId != currentUserId)
            return new List<QuizQuestionDto>();

        var questions = await _quizRepository.GetQuestionsByQuizIdAsync(quizId);
        return questions.Select(MapToQuizQuestionDto);
    }

    public async Task<QuizQuestionDto?> GetQuizQuestionByIdAsync(int id, int? currentUserId)
    {
        var question = await _quizRepository.GetQuizQuestionByIdAsync(id);
        if (question == null || question.Quiz == null)
            return null;

        var quiz = question.Quiz;

        // If the quiz is disabled, treat as not found
        if (quiz.Disabled)
            return null;

        // Check visibility and ownership
        if (quiz.Visibility == "private" && quiz.UserId != currentUserId)
            return null;

        return MapToQuizQuestionDto(question);
    }

    public async Task<QuizQuestionDto> CreateQuizQuestionAsync(int quizId, int userId, CreateQuizQuestionDto dto)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            throw new ArgumentException("Quiz not found");

        if (quiz.UserId != userId)
            throw new UnauthorizedAccessException("You do not own this quiz");

        // Validate snapshot if provided
        if (!string.IsNullOrWhiteSpace(dto.QuestionSnapshotJson))
        {
            ValidateQuestionSnapshot(dto.QuestionSnapshotJson);
        }

        var question = new QuizQuestion
        {
            QuizId = quizId,
            OriginalQuestionId = dto.OriginalQuestionId,
            QuestionSnapshotJson = dto.QuestionSnapshotJson,
            DisplayOrder = dto.DisplayOrder
        };

        var created = await _quizRepository.CreateQuizQuestionAsync(question);
        return MapToQuizQuestionDto(created);
    }

    public async Task<QuizQuestionDto?> UpdateQuizQuestionAsync(int id, int userId, UpdateQuizQuestionDto dto)
    {
        var question = await _quizRepository.GetQuizQuestionByIdAsync(id);
        if (question == null)
            return null;

        if (question.Quiz.UserId != userId)
            throw new UnauthorizedAccessException("You do not own this quiz");

        // Validate snapshot if provided
        if (dto.QuestionSnapshotJson != null && !string.IsNullOrWhiteSpace(dto.QuestionSnapshotJson))
        {
            ValidateQuestionSnapshot(dto.QuestionSnapshotJson);
        }

        question.OriginalQuestionId = dto.OriginalQuestionId ?? question.OriginalQuestionId;
        question.QuestionSnapshotJson = dto.QuestionSnapshotJson ?? question.QuestionSnapshotJson;
        question.DisplayOrder = dto.DisplayOrder ?? question.DisplayOrder;
        question.UpdatedAt = DateTime.UtcNow;

        await _quizRepository.UpdateQuizQuestionAsync(question);
        return MapToQuizQuestionDto(question);
    }

    public async Task<bool> DeleteQuizQuestionAsync(int id, int userId, bool isAdmin)
    {
        var question = await _quizRepository.GetQuizQuestionByIdAsync(id);
        if (question == null)
            return false;

        if (!isAdmin && question.Quiz.UserId != userId)
            return false;

        await _quizRepository.DeleteQuizQuestionAsync(id);
        return true;
    }

    private QuizQuestionDto MapToQuizQuestionDto(QuizQuestion qq)
    {
        return new QuizQuestionDto
        {
            Id = qq.Id,
            QuizId = qq.QuizId,
            OriginalQuestionId = qq.OriginalQuestionId,
            QuestionSnapshotJson = qq.QuestionSnapshotJson,
            DisplayOrder = qq.DisplayOrder,
            CreatedAt = qq.CreatedAt,
            UpdatedAt = qq.UpdatedAt
        };
    }

    // ------------------------------------------------------------------------
    // NEW: Validate question snapshot using the shared helper
    // ------------------------------------------------------------------------
    private void ValidateQuestionSnapshot(string snapshotJson)
    {
        try
        {
            using JsonDocument doc = JsonDocument.Parse(snapshotJson);
            JsonElement root = doc.RootElement;

            // Extract required fields
            if (!root.TryGetProperty("type", out JsonElement typeElem) || typeElem.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Question snapshot must contain a 'type' field (string).");
            string type = typeElem.GetString()!;

            if (!root.TryGetProperty("content", out JsonElement contentElem) || contentElem.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Question snapshot must contain a 'content' field (string).");
            string content = contentElem.GetString()!;

            // Metadata may be an object or null; convert to JSON string for validation
            string metadataJson = null;
            if (root.TryGetProperty("metadata", out JsonElement metadataElem))
            {
                metadataJson = metadataElem.ValueKind == JsonValueKind.Null ? "null" : metadataElem.GetRawText();
            }

            // Validate using the shared helper
            QuestionValidationHelper.ValidateQuestionMetadata(type, content, metadataJson);
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Invalid JSON format in question snapshot.", ex);
        }
    }

    public async Task<IEnumerable<NoteDto>> GetQuizNotesAsync(int quizId, int? currentUserId)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            return Enumerable.Empty<NoteDto>();

        // Check visibility
        if (quiz.Visibility == "private" && quiz.UserId != currentUserId)
            return Enumerable.Empty<NoteDto>();

        var notes = await _quizRepository.GetNotesByQuizIdAsync(quizId);
        return notes.Select(n => new NoteDto
        {
            Id = n.Id,
            Title = n.Title,
            Content = n.Content,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt
        });
    }

    public async Task<NoteDto> AddNoteToQuizAsync(int quizId, int userId, AddNoteToQuizDto dto)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            throw new ArgumentException("Quiz not found");

        if (quiz.UserId != userId)
            throw new UnauthorizedAccessException("You do not own this quiz");

        Note.Note? note;
        if (dto.NoteId.HasValue)
        {
            // Attach existing note – verify it belongs to the user
            note = await _quizRepository.GetNoteByIdAndUserAsync(dto.NoteId.Value, userId);
            if (note == null)
                throw new ArgumentException("Note not found or does not belong to you");

            await _quizRepository.AddNoteToQuizAsync(quizId, note.Id);
        }
        else if (!string.IsNullOrWhiteSpace(dto.Title) && !string.IsNullOrWhiteSpace(dto.Content))
        {
            // Create new note
            note = await _quizRepository.CreateNoteAndAddToQuizAsync(quizId, userId, dto.Title, dto.Content);
        }
        else
        {
            throw new ArgumentException("Either provide a NoteId or both Title and Content");
        }

        return new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt
        };
    }

    public async Task<bool> RemoveNoteFromQuizAsync(int quizId, int noteId, int userId, bool isAdmin)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            return false;

        if (!isAdmin && quiz.UserId != userId)
            return false;

        await _quizRepository.RemoveNoteFromQuizAsync(quizId, noteId);
        return true;
    }

    public async Task<IEnumerable<SourceDto>> GetQuizSourcesAsync(int quizId, int? currentUserId)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            return Enumerable.Empty<SourceDto>();

        // Respect privacy: only owner can see sources of private quizzes
        if (quiz.Visibility == "private" && quiz.UserId != currentUserId)
            return Enumerable.Empty<SourceDto>();

        var sources = await _quizRepository.GetSourcesByQuizIdAsync(quizId);
        return sources.Select(MapSourceToDto);
    }

    public async Task<SourceDto> AddSourceToQuizAsync(int quizId, int userId, int sourceId)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            throw new ArgumentException("Quiz not found");

        if (quiz.UserId != userId)
            throw new UnauthorizedAccessException("You do not own this quiz");

        var source = await _sourceRepository.GetByIdAsync(sourceId);
        if (source == null || source.UserId != userId)
            throw new ArgumentException("Source not found or does not belong to you");

        await _quizRepository.AddSourceToQuizAsync(quizId, sourceId);
        return MapSourceToDto(source);
    }

    public async Task<bool> RemoveSourceFromQuizAsync(int quizId, int sourceId, int userId, bool isAdmin)
    {
        var quiz = await _quizRepository.GetByIdAsync(quizId);
        if (quiz == null)
            return false;

        if (!isAdmin && quiz.UserId != userId)
            return false;

        await _quizRepository.RemoveSourceFromQuizAsync(quizId, sourceId);
        return true;
    }

    // Helper mapping method (same as in SourceService)
    private SourceDto MapSourceToDto(Source.Source s)
    {
        return new SourceDto
        {
            Id = s.Id,
            UserId = s.UserId,
            Type = s.Type,
            Title = s.Title,
            Url = s.Url,
            RawText = s.RawText,
            FilePath = s.FilePath,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            Metadata = s.MetadataJson
        };
    }
}