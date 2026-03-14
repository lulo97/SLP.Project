using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using backend_dotnet.Features.Tag;
using backend_dotnet.Helpers;   // <-- ADDED

namespace backend_dotnet.Features.Question;

public class QuestionService : IQuestionService
{
    private readonly IQuestionRepository _questionRepository;
    private readonly ITagRepository _tagRepository;

    public QuestionService(IQuestionRepository questionRepository, ITagRepository tagRepository)
    {
        _questionRepository = questionRepository;
        _tagRepository = tagRepository;
    }

    public async Task<QuestionDto?> GetQuestionByIdAsync(int id)
    {
        var question = await _questionRepository.GetByIdAsync(id);
        return question == null ? null : MapToDto(question);
    }

    public async Task<IEnumerable<QuestionListDto>> GetUserQuestionsAsync(int userId)
    {
        var questions = await _questionRepository.GetUserQuestionsAsync(userId);
        return questions.Select(MapToListDto);
    }

    public async Task<IEnumerable<QuestionListDto>> GetAllQuestionsAsync()
    {
        var questions = await _questionRepository.GetAllQuestionsAsync();
        return questions.Select(MapToListDto);
    }

    public async Task<QuestionDto> CreateQuestionAsync(int userId, CreateQuestionDto dto)
    {
        // Validate metadata based on type
        QuestionValidationHelper.ValidateQuestionMetadata(dto.Type, dto.Content, dto.MetadataJson);   // <-- CHANGED

        var question = new Question
        {
            UserId = userId,
            Type = dto.Type,
            Content = dto.Content,
            Explanation = dto.Explanation,
            MetadataJson = dto.MetadataJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (dto.TagNames != null && dto.TagNames.Any())
        {
            var tags = await _tagRepository.GetOrCreateTagsAsync(dto.TagNames);
            question.QuestionTags = tags.Select(t => new QuestionTag { Tag = t }).ToList();
        }

        var created = await _questionRepository.CreateAsync(question);
        return MapToDto(created);
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(int id, int userId, UpdateQuestionDto dto)
    {
        var question = await _questionRepository.GetByIdAsync(id);
        if (question == null || question.UserId != userId)
            return null;

        // Determine the effective type after update (if type is being changed)
        string effectiveType = dto.Type ?? question.Type;

        // If metadata is being updated, validate it using the effective type and content
        if (dto.MetadataJson != null)
        {
            // Content might also be updated; use the new content if provided
            string effectiveContent = dto.Content ?? question.Content;
            QuestionValidationHelper.ValidateQuestionMetadata(effectiveType, effectiveContent, dto.MetadataJson);   // <-- CHANGED
        }

        question.Type = dto.Type ?? question.Type;
        question.Content = dto.Content ?? question.Content;
        question.Explanation = dto.Explanation ?? question.Explanation;
        question.MetadataJson = dto.MetadataJson ?? question.MetadataJson;

        if (dto.TagNames != null)
        {
            _tagRepository.RemoveQuestionTags(question.Id);
            var tags = await _tagRepository.GetOrCreateTagsAsync(dto.TagNames);
            question.QuestionTags = tags.Select(t => new QuestionTag { QuestionId = question.Id, TagId = t.Id }).ToList();
        }

        await _questionRepository.UpdateAsync(question);
        return MapToDto(question);
    }

    public async Task<bool> DeleteQuestionAsync(int id, int userId, bool isAdmin)
    {
        var question = await _questionRepository.GetByIdAsync(id);
        if (question == null)
            return false;

        if (!isAdmin && question.UserId != userId)
            return false;

        await _questionRepository.SoftDeleteAsync(id);
        return true;
    }

    public async Task<IEnumerable<QuestionListDto>> SearchQuestionsAsync(QuestionSearchDto search)
    {
        var questions = await _questionRepository.SearchAsync(search.SearchTerm, search.Type, search.Tags, search.UserId);
        return questions.Select(MapToListDto);
    }

    // ------------------------------------------------------------------------
    // Mapping helpers (unchanged)
    // ------------------------------------------------------------------------
    private QuestionDto MapToDto(Question q)
    {
        return new QuestionDto
        {
            Id = q.Id,
            UserId = q.UserId,
            Type = q.Type,
            Content = q.Content,
            Explanation = q.Explanation,
            MetadataJson = q.MetadataJson,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt,
            Tags = q.QuestionTags?.Select(qt => qt.Tag?.Name ?? "").ToList() ?? new List<string>(),
            UserName = q.User?.Username
        };
    }

    private QuestionListDto MapToListDto(Question q)
    {
        return new QuestionListDto
        {
            Id = q.Id,
            Type = q.Type,
            Content = q.Content,
            Explanation = q.Explanation,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt,
            Tags = q.QuestionTags?.Select(qt => qt.Tag?.Name ?? "").ToList() ?? new List<string>(),
            UserName = q.User?.Username
        };
    }
}