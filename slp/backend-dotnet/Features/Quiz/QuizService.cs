using backend_dotnet.Features.Tag;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace backend_dotnet.Features.Quiz;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepository;
    private readonly ITagRepository _tagRepository;

    public QuizService(IQuizRepository quizRepository, ITagRepository tagRepository)
    {
        _quizRepository = quizRepository;
        _tagRepository = tagRepository;
    }

    public async Task<QuizDto?> GetQuizByIdAsync(int id, int? currentUserId)
    {
        var quiz = await _quizRepository.GetByIdAsync(id);
        if (quiz == null)
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
        var quiz = await _quizRepository.GetByIdAsync(id);
        if (quiz == null || quiz.UserId != userId)
            return null;

        quiz.Title = dto.Title ?? quiz.Title;
        quiz.Description = dto.Description ?? quiz.Description;
        quiz.Visibility = dto.Visibility ?? quiz.Visibility;

        // Update tags if provided
        if (dto.TagNames != null)
        {
            // Remove existing
            _tagRepository.RemoveQuizTags(quiz.Id);
            var tags = await _tagRepository.GetOrCreateTagsAsync(dto.TagNames);
            quiz.QuizTags = tags.Select(t => new QuizTag { QuizId = quiz.Id, TagId = t.Id }).ToList();
        }

        await _quizRepository.UpdateAsync(quiz);
        return MapToDto(quiz);
    }

    public async Task<bool> DeleteQuizAsync(int id, int userId, bool isAdmin)
    {
        var quiz = await _quizRepository.GetByIdAsync(id);
        if (quiz == null)
            return false;

        if (!isAdmin && quiz.UserId != userId)
            return false;

        await _quizRepository.SoftDeleteAsync(id);
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

    public async Task<IEnumerable<QuizListDto>> SearchQuizzesAsync(string? searchTerm, int? userId, bool publicOnly)
    {
        var quizzes = await _quizRepository.SearchAsync(searchTerm, userId, publicOnly);
        return quizzes.Select(MapToListDto);
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
            Visibility = quiz.Visibility,
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

        // Validate JSON string
        if (!string.IsNullOrWhiteSpace(dto.QuestionSnapshotJson))
        {
            try
            {
                JsonDocument.Parse(dto.QuestionSnapshotJson);
            }
            catch (JsonException)
            {
                throw new ArgumentException("Invalid JSON format in question snapshot.");
            }
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

        // Validate JSON if provided
        if (dto.QuestionSnapshotJson != null && !string.IsNullOrWhiteSpace(dto.QuestionSnapshotJson))
        {
            try
            {
                JsonDocument.Parse(dto.QuestionSnapshotJson);
            }
            catch (JsonException)
            {
                throw new ArgumentException("Invalid JSON format in question snapshot.");
            }
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
}