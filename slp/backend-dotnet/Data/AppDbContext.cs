using backend_dotnet.Features.Note;
using backend_dotnet.Features.Question;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.QuizAttempt;
using backend_dotnet.Features.Session;
using backend_dotnet.Features.Source;
using backend_dotnet.Features.Tag;
using backend_dotnet.Features.User;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();

    // New DbSets for Day 2
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizTag> QuizTags => Set<QuizTag>();
    public DbSet<QuizSource> QuizSources => Set<QuizSource>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionTag> QuestionTags => Set<QuestionTag>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<QuizNote> QuizNotes { get; set; }
    public DbSet<QuizAttempt> QuizAttempts { get; set; }
    public DbSet<QuizAttemptAnswer> QuizAttemptAnswers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration (existing)
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // Session configuration (existing)
        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.TokenHash).IsUnique();
            entity.HasOne(s => s.User)
                  .WithMany()
                  .HasForeignKey(s => s.UserId);
        });

        // Quiz configuration
        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(q => q.Visibility).HasDefaultValue("private");
            entity.HasQueryFilter(q => !q.Disabled); // soft delete filter
            entity.HasOne(q => q.User)
                  .WithMany()
                  .HasForeignKey(q => q.UserId);
            entity.HasOne(q => q.Note)
                  .WithMany()
                  .HasForeignKey(q => q.NoteId)
                  .IsRequired(false);
        });

        // QuizQuestion configuration
        modelBuilder.Entity<QuizQuestion>(entity =>
        {
            entity.HasKey(qq => qq.Id);
            entity.HasOne(qq => qq.Quiz)
                  .WithMany(q => q.QuizQuestions)
                  .HasForeignKey(qq => qq.QuizId)
                  .IsRequired(false);
            entity.HasOne(qq => qq.OriginalQuestion)
                  .WithMany()
                  .HasForeignKey(qq => qq.OriginalQuestionId)
                  .IsRequired(false);
        });

        // QuizTag (composite key)
        modelBuilder.Entity<QuizTag>(entity =>
        {
            entity.HasKey(qt => new { qt.QuizId, qt.TagId });
            entity.HasOne(qt => qt.Quiz)
                  .WithMany(q => q.QuizTags)
                  .HasForeignKey(qt => qt.QuizId)
                  .IsRequired(false);
            entity.HasOne(qt => qt.Tag)
                  .WithMany(t => t.QuizTags)
                  .HasForeignKey(qt => qt.TagId);
        });

        // QuizSource (composite key) - FIXED: Made Source relationship optional
        modelBuilder.Entity<QuizSource>(entity =>
        {
            entity.HasKey(qs => new { qs.QuizId, qs.SourceId });
            entity.HasOne(qs => qs.Quiz)
                  .WithMany(q => q.QuizSources)
                  .HasForeignKey(qs => qs.QuizId)
                  .IsRequired(false);
            entity.HasOne(qs => qs.Source)
                  .WithMany() // Source may not have collection back
                  .HasForeignKey(qs => qs.SourceId)
                  .IsRequired(false); // 👈 Added this line to fix Source warning
        });

        // Question configuration
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.HasOne(q => q.User)
                  .WithMany()
                  .HasForeignKey(q => q.UserId);
            // If you add soft delete later, add query filter here
        });

        // QuestionTag (composite key)
        modelBuilder.Entity<QuestionTag>(entity =>
        {
            entity.HasKey(qt => new { qt.QuestionId, qt.TagId });
            entity.HasOne(qt => qt.Question)
                  .WithMany(q => q.QuestionTags)
                  .HasForeignKey(qt => qt.QuestionId);
            entity.HasOne(qt => qt.Tag)
                  .WithMany(t => t.QuestionTags)
                  .HasForeignKey(qt => qt.TagId);
        });

        // Source configuration
        modelBuilder.Entity<Source>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasQueryFilter(s => s.DeletedAt == null); // soft delete
            entity.HasOne(s => s.User)
                  .WithMany()
                  .HasForeignKey(s => s.UserId);
        });

        // Tag configuration
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.Name).IsUnique();
        });

        // Note configuration
        modelBuilder.Entity<Note>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.HasOne(n => n.User)
                  .WithMany()
                  .HasForeignKey(n => n.UserId);
            entity.HasIndex(n => n.UserId);
        });

        modelBuilder.Entity<QuizNote>()
            .HasKey(qn => new { qn.QuizId, qn.NoteId });

        modelBuilder.Entity<QuizNote>()
            .HasKey(qn => new { qn.QuizId, qn.NoteId });
    }
}