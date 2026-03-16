using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Quiz;

public class QuizRepository : IQuizRepository
{
    private readonly AppDbContext _context;

    public QuizRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Quiz?> GetByIdAsync(int id, bool includeDisabled = false)
    {
        IQueryable<Quiz> query = _context.Quizzes
            .Include(q => q.QuizQuestions.OrderBy(qq => qq.DisplayOrder))
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .Include(q => q.QuizSources).ThenInclude(qs => qs.Source)
            .Include(q => q.QuizNotes).ThenInclude(qn => qn.Note)
            .Include(q => q.User);

        if (includeDisabled)
        {
            // Bypass the global query filter to include disabled quizzes
            query = query.IgnoreQueryFilters();
        }
        else
        {
            // Explicitly exclude disabled quizzes (global filter may also apply)
            query = query.Where(q => !q.Disabled);
        }

        return await query.FirstOrDefaultAsync(q => q.Id == id);
    }

    public async Task<IEnumerable<Quiz>> GetUserQuizzesAsync(int userId, bool includeDisabled = false)
    {
        var query = _context.Quizzes.Where(q => q.UserId == userId);
        if (!includeDisabled)
            query = query.Where(q => !q.Disabled);
        return await query
            .Include(q => q.User)                   // ← ADD THIS
            .Include(q => q.QuizQuestions)          // ← ADD THIS
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Quiz>> GetPublicQuizzesAsync(string? visibility = null, bool includeDisabled = false)
    {
        var query = _context.Quizzes.AsQueryable();
        if (!includeDisabled)
            query = query.Where(q => !q.Disabled);

        if (string.IsNullOrEmpty(visibility) || visibility == "public")
            query = query.Where(q => q.Visibility == "public");
        else if (visibility == "unlisted")
            query = query.Where(q => q.Visibility == "unlisted");

        return await query
            .Include(q => q.User)
            .Include(q => q.QuizQuestions)          // ← ADD THIS
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<Quiz> CreateAsync(Quiz quiz)
    {
        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync();
        return quiz;
    }

    public async Task UpdateAsync(Quiz quiz)
    {
        quiz.UpdatedAt = DateTime.UtcNow;
        _context.Quizzes.Update(quiz);
        await _context.SaveChangesAsync();
    }

    // REPLACE the existing SoftDeleteAsync:
    public async Task SoftDeleteAsync(int id)
    {
        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz != null)
        {
            quiz.Disabled = true;
            quiz.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    // ADD a true hard delete — this is what DELETE /api/quiz/{id} should call:
    public async Task HardDeleteAsync(int id)
    {
        // WHY raw SQL instead of _context.Quizzes.Remove():
        //
        // DeleteQuizAsync calls GetByIdAsync before this method, which loads the Quiz
        // entity WITH its QuizQuestions into EF's change tracker. Calling Remove() then
        // causes EF to sever the in-memory FK relationship before issuing the SQL DELETE.
        // Because quiz_id is non-nullable (required relationship), EF throws:
        //   InvalidOperationException: "association has been severed but relationship is required"
        //
        // Bypassing EF tracking with raw SQL avoids this entirely.
        // Postgres ON DELETE CASCADE on quiz_question, quiz_attempt, quiz_attempt_answer,
        // quiz_tag, quiz_note, quiz_source, quiz_view removes all child rows automatically.
        await _context.Database.ExecuteSqlRawAsync(
            "DELETE FROM quiz WHERE id = {0}", id);
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Quizzes.AnyAsync(q => q.Id == id && !q.Disabled);
    }

    public async Task<IEnumerable<Quiz>> SearchAsync(string? searchTerm, int? userId, bool publicOnly = true)
    {
        var query = _context.Quizzes.Where(q => !q.Disabled);
        if (publicOnly)
            query = query.Where(q => q.Visibility == "public");
        if (userId.HasValue)
            query = query.Where(q => q.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = $"%{searchTerm}%";
            query = query.Where(q => EF.Functions.ILike(q.Title, searchTerm) ||
                                     (q.Description != null && EF.Functions.ILike(q.Description, searchTerm)));
        }
        return await query
            .Include(q => q.User)
            .Include(q => q.QuizQuestions)          // ← ADD THIS
            .Include(q => q.QuizTags).ThenInclude(qt => qt.Tag)
            .OrderByDescending(q => q.UpdatedAt)
            .ToListAsync();
    }

    // ==================== QuizQuestion repository methods ====================

    public async Task<IEnumerable<QuizQuestion>> GetQuestionsByQuizIdAsync(int quizId)
    {
        return await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .OrderBy(qq => qq.DisplayOrder)
            .ToListAsync();
    }

    public async Task<QuizQuestion?> GetQuizQuestionByIdAsync(int id)
    {
        return await _context.QuizQuestions
            .Include(qq => qq.Quiz)
            .FirstOrDefaultAsync(qq => qq.Id == id);
    }

    public async Task<QuizQuestion> CreateQuizQuestionAsync(QuizQuestion quizQuestion)
    {
        quizQuestion.CreatedAt = DateTime.UtcNow;
        quizQuestion.UpdatedAt = DateTime.UtcNow;
        _context.QuizQuestions.Add(quizQuestion);
        await _context.SaveChangesAsync();
        return quizQuestion;
    }

    public async Task UpdateQuizQuestionAsync(QuizQuestion quizQuestion)
    {
        quizQuestion.UpdatedAt = DateTime.UtcNow;
        _context.QuizQuestions.Update(quizQuestion);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteQuizQuestionAsync(int id)
    {
        var question = await _context.QuizQuestions.FindAsync(id);
        if (question != null)
        {
            _context.QuizQuestions.Remove(question);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ReorderQuizQuestionsAsync(int quizId, List<int> questionIds)
    {
        var questions = await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .ToListAsync();

        for (int i = 0; i < questionIds.Count; i++)
        {
            var q = questions.FirstOrDefault(qq => qq.Id == questionIds[i]);
            if (q != null)
            {
                q.DisplayOrder = i + 1;
                q.UpdatedAt = DateTime.UtcNow;
            }
        }
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Note.Note>> GetNotesByQuizIdAsync(int quizId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizNotes)
                .ThenInclude(qn => qn.Note)
            .FirstOrDefaultAsync(q => q.Id == quizId && !q.Disabled);
        return quiz?.QuizNotes.Select(qn => qn.Note) ?? Enumerable.Empty<Note.Note>();
    }

    public async Task AddNoteToQuizAsync(int quizId, int noteId)
    {
        var quizNote = new QuizNote { QuizId = quizId, NoteId = noteId };
        _context.QuizNotes.Add(quizNote);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveNoteFromQuizAsync(int quizId, int noteId)
    {
        var quizNote = await _context.QuizNotes
            .FirstOrDefaultAsync(qn => qn.QuizId == quizId && qn.NoteId == noteId);
        if (quizNote != null)
        {
            _context.QuizNotes.Remove(quizNote);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<Note.Note> CreateNoteAndAddToQuizAsync(int quizId, int userId, string title, string content)
    {
        var note = new Note.Note
        {
            UserId = userId,
            Title = title,
            Content = content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Notes.Add(note);
        await _context.SaveChangesAsync(); // save to generate Id

        await AddNoteToQuizAsync(quizId, note.Id);
        return note;
    }

    public async Task<Note.Note?> GetNoteByIdAndUserAsync(int noteId, int userId)
    {
        return await _context.Notes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
    }

    public async Task<IEnumerable<Source.Source>> GetSourcesByQuizIdAsync(int quizId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizSources)
                .ThenInclude(qs => qs.Source)
            .FirstOrDefaultAsync(q => q.Id == quizId && !q.Disabled);

        return quiz?.QuizSources.Select(qs => qs.Source) ?? Enumerable.Empty<Source.Source>();
    }

    public async Task AddSourceToQuizAsync(int quizId, int sourceId)
    {
        // Avoid duplicates
        var exists = await _context.QuizSources
            .AnyAsync(qs => qs.QuizId == quizId && qs.SourceId == sourceId);

        if (!exists)
        {
            var quizSource = new QuizSource { QuizId = quizId, SourceId = sourceId };
            _context.QuizSources.Add(quizSource);
            await _context.SaveChangesAsync();
        }
    }

    public async Task RemoveSourceFromQuizAsync(int quizId, int sourceId)
    {
        var quizSource = await _context.QuizSources
            .FirstOrDefaultAsync(qs => qs.QuizId == quizId && qs.SourceId == sourceId);

        if (quizSource != null)
        {
            _context.QuizSources.Remove(quizSource);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Quiz>> GetAllForAdminAsync()
    {
        // Ignore the global query filter (Disabled == false) to see all quizzes
        return await _context.Quizzes
            .IgnoreQueryFilters()
            .Include(q => q.User)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }
}