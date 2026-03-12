using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.Question;
using Npgsql; // Add this using for PostgresException

namespace backend_dotnet.Features.Tag;

public class TagRepository : ITagRepository
{
    private readonly AppDbContext _context;

    public TagRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Tag?> GetByNameAsync(string name)
    {
        return await _context.Tags.FirstOrDefaultAsync(t => t.Name == name);
    }

    public async Task<List<Tag>> GetOrCreateTagsAsync(IEnumerable<string> names)
    {
        var distinctNames = names.Select(n => n.Trim()).Distinct().ToList();
        var result = new List<Tag>();

        foreach (var name in distinctNames)
        {
            var tag = await GetOrCreateTagAsync(name);
            result.Add(tag);
        }

        return result;
    }

    private async Task<Tag> GetOrCreateTagAsync(string name)
    {
        // First try to get existing tag
        var existingTag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == name);
        if (existingTag != null)
            return existingTag;

        // Try to create new tag with retry logic for concurrency
        var newTag = new Tag { Name = name };

        try
        {
            _context.Tags.Add(newTag);
            await _context.SaveChangesAsync();
            return newTag;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
        {
            // Unique constraint violation - tag was created by another request
            // Detach the failed entity to avoid tracking conflicts
            _context.Entry(newTag).State = EntityState.Detached;

            // Fetch the tag that was created by the other request
            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == name);
            if (tag != null)
                return tag;

            // If still not found (unlikely, but handle gracefully), create it one more time
            // This time it should succeed as the race condition window has passed
            _context.Tags.Add(new Tag { Name = name });
            await _context.SaveChangesAsync();
            return newTag;
        }
    }

    // Alternative efficient approach using bulk insert with ON CONFLICT
    // Uncomment this if you prefer a single database round-trip
    /*
    public async Task<List<Tag>> GetOrCreateTagsBulkAsync(IEnumerable<string> names)
    {
        var distinctNames = names.Select(n => n.Trim()).Distinct().ToList();
        
        // Use raw SQL with PostgreSQL's ON CONFLICT clause for efficient bulk upsert
        await _context.Database.ExecuteSqlRawAsync(@"
            INSERT INTO tag (name)
            SELECT unnest({0}::text[])
            ON CONFLICT (name) DO NOTHING",
            distinctNames.ToArray()
        );
        
        // Fetch all tags (both existing and newly created)
        return await _context.Tags
            .Where(t => distinctNames.Contains(t.Name))
            .ToListAsync();
    }
    */

    public async Task RemoveQuizTags(int quizId)
    {
        var quizTags = _context.Set<QuizTag>().Where(qt => qt.QuizId == quizId);
        _context.Set<QuizTag>().RemoveRange(quizTags);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveQuestionTags(int questionId)
    {
        var questionTags = _context.Set<QuestionTag>().Where(qt => qt.QuestionId == questionId);
        _context.Set<QuestionTag>().RemoveRange(questionTags);
        await _context.SaveChangesAsync();
    }
}