using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using backend_dotnet.Data;
using backend_dotnet.Features.Question;
using backend_dotnet.Features.Quiz;

namespace backend_dotnet.Features.Tag;

public class TagRepository : ITagRepository
{
    private readonly AppDbContext _context;
    private readonly ILogger<TagRepository> _logger;
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1); // Instance-level semaphore

    public TagRepository(AppDbContext context, ILogger<TagRepository> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<Tag>> GetOrCreateTagsAsync(IEnumerable<string> names)
    {
        // Wait to ensure only one operation uses the DbContext at a time
        await _semaphore.WaitAsync();
        try
        {
            _logger.LogInformation("GetOrCreateTagsAsync called with {TagCount} tags", names?.Count() ?? 0);

            if (names == null)
            {
                _logger.LogWarning("GetOrCreateTagsAsync received null names, returning empty list");
                return new List<Tag>();
            }

            var distinctNames = names
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            _logger.LogDebug("After processing: {TagCount} distinct non-empty tags: {TagList}",
                distinctNames.Count, string.Join(", ", distinctNames));

            if (!distinctNames.Any())
            {
                _logger.LogInformation("No valid tags to process, returning empty list");
                return new List<Tag>();
            }

            // Bulk insert using interpolated SQL (handles array conversion automatically)
            _logger.LogDebug("Executing bulk insert for tags: {TagList}", string.Join(", ", distinctNames));

            var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO tag (name) SELECT UNNEST({distinctNames}) ON CONFLICT (name) DO NOTHING"
            );

            _logger.LogInformation("Bulk insert completed. {NewTagCount} new tags created", rowsAffected);

            // Fetch all tags (both existing and newly created)
            _logger.LogDebug("Fetching all tags from database with names: {TagList}", string.Join(", ", distinctNames));

            var tags = await _context.Tags
                .Where(t => distinctNames.Contains(t.Name))
                .ToListAsync();

            _logger.LogInformation("Retrieved {RetrievedCount} tags from database", tags.Count);

            // Sanity check: ensure we got all requested tags
            var missingTags = distinctNames.Except(tags.Select(t => t.Name), StringComparer.OrdinalIgnoreCase).ToList();
            if (missingTags.Any())
            {
                _logger.LogWarning("Missing {MissingCount} tags after bulk insert: {MissingTags}",
                    missingTags.Count, string.Join(", ", missingTags));
            }
            else
            {
                _logger.LogInformation("Successfully retrieved/created all {TagCount} tags", tags.Count);
            }

            return tags;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Tag?> GetByNameAsync(string name)
    {
        await _semaphore.WaitAsync();
        try
        {
            _logger.LogDebug("GetByNameAsync called for tag '{TagName}'", name);

            if (string.IsNullOrWhiteSpace(name))
            {
                _logger.LogWarning("GetByNameAsync received invalid name: '{TagName}'", name);
                return null;
            }

            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == name.Trim());

            if (tag != null)
                _logger.LogDebug("Found tag '{TagName}' with ID {TagId}", name, tag.Id);
            else
                _logger.LogDebug("Tag '{TagName}' not found", name);

            return tag;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task RemoveQuizTags(int quizId)
    {
        await _semaphore.WaitAsync();
        try
        {
            _logger.LogInformation("RemoveQuizTags called for quiz ID {QuizId}", quizId);

            var quizExists = await _context.Quizzes.AnyAsync(q => q.Id == quizId);
            if (!quizExists)
            {
                _logger.LogWarning("Quiz ID {QuizId} does not exist, no tags to remove", quizId);
                return;
            }

            var quizTags = await _context.Set<QuizTag>()
                .Where(qt => qt.QuizId == quizId)
                .ToListAsync();

            _logger.LogDebug("Found {TagCount} tags to remove for quiz ID {QuizId}", quizTags.Count, quizId);

            if (quizTags.Any())
            {
                _context.Set<QuizTag>().RemoveRange(quizTags);
                var removedCount = await _context.SaveChangesAsync();

                if (removedCount == quizTags.Count)
                    _logger.LogInformation("Successfully removed {RemovedCount} tags for quiz ID {QuizId}", removedCount, quizId);
                else
                    _logger.LogError("Expected to remove {ExpectedCount} tags but removed {ActualCount} for quiz ID {QuizId}",
                        quizTags.Count, removedCount, quizId);
            }
            else
            {
                _logger.LogInformation("No tags to remove for quiz ID {QuizId}", quizId);
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task RemoveQuestionTags(int questionId)
    {
        await _semaphore.WaitAsync();
        try
        {
            _logger.LogInformation("RemoveQuestionTags called for question ID {QuestionId}", questionId);

            var questionExists = await _context.Questions.AnyAsync(q => q.Id == questionId);
            if (!questionExists)
            {
                _logger.LogWarning("Question ID {QuestionId} does not exist, no tags to remove", questionId);
                return;
            }

            var questionTags = await _context.Set<QuestionTag>()
                .Where(qt => qt.QuestionId == questionId)
                .ToListAsync();

            _logger.LogDebug("Found {TagCount} tags to remove for question ID {QuestionId}", questionTags.Count, questionId);

            if (questionTags.Any())
            {
                _context.Set<QuestionTag>().RemoveRange(questionTags);
                var removedCount = await _context.SaveChangesAsync();

                if (removedCount == questionTags.Count)
                    _logger.LogInformation("Successfully removed {RemovedCount} tags for question ID {QuestionId}", removedCount, questionId);
                else
                    _logger.LogError("Expected to remove {ExpectedCount} tags but removed {ActualCount} for question ID {QuestionId}",
                        questionTags.Count, removedCount, questionId);
            }
            else
            {
                _logger.LogInformation("No tags to remove for question ID {QuestionId}", questionId);
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }
}