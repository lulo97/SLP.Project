using backend_dotnet.Features.Admin;
using backend_dotnet.Features.Comment;
using backend_dotnet.Features.Dashboard;
using backend_dotnet.Features.Explanation;
using backend_dotnet.Features.Llm;
using backend_dotnet.Features.Note;
using backend_dotnet.Features.Question;
using backend_dotnet.Features.Quiz;
using backend_dotnet.Features.QuizAttempt;
using backend_dotnet.Features.Report;
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
    public DbSet<Explanation> Explanations => Set<Explanation>();
    public DbSet<Features.Progress.UserSourceProgress> UserSourceProgresses => Set<Features.Progress.UserSourceProgress>();
    public DbSet<Features.Favorite.FavoriteItem> FavoriteItems => Set<Features.Favorite.FavoriteItem>();
    public DbSet<LlmLog> LlmLogs { get; set; }
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<AdminLog> AdminLogs => Set<AdminLog>();
    public DbSet<CommentHistory> CommentHistories => Set<CommentHistory>();
    public DbSet<DailyWord> DailyWords => Set<DailyWord>();
    public DbSet<Features.Metrics.MetricEntry> Metrics => Set<Features.Metrics.MetricEntry>();


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

        // QuizSource (composite key)
        modelBuilder.Entity<QuizSource>(entity =>
        {
            entity.HasKey(qs => new { qs.QuizId, qs.SourceId });
            entity.HasOne(qs => qs.Quiz)
                  .WithMany(q => q.QuizSources)
                  .HasForeignKey(qs => qs.QuizId)
                  .IsRequired(false);
            entity.HasOne(qs => qs.Source)
                  .WithMany()
                  .HasForeignKey(qs => qs.SourceId)
                  .IsRequired(false);
        });

        // Question configuration
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.HasOne(q => q.User)
                  .WithMany()
                  .HasForeignKey(q => q.UserId);
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

        // QuizNote (composite key) — FIX: Quiz has a query filter so the
        // relationship must be optional to suppress EF Core WRN warning.
        modelBuilder.Entity<QuizNote>(entity =>
        {
            entity.HasKey(qn => new { qn.QuizId, qn.NoteId });
            entity.HasOne(qn => qn.Quiz)
                  .WithMany(q => q.QuizNotes)   // ← name the collection so EF doesn't create a shadow FK
                  .HasForeignKey(qn => qn.QuizId)
                  .IsRequired(false); // ← suppresses WRN: Quiz has query filter
        });

        // QuizAttempt — FIX: Quiz has a query filter so mark FK optional.
        modelBuilder.Entity<QuizAttempt>(entity =>
        {
            entity.HasOne(a => a.Quiz)
                  .WithMany(q => q.Attempts)    // ← name the collection so EF doesn't create a shadow FK
                  .HasForeignKey(a => a.QuizId)
                  .IsRequired(false); // ← suppresses WRN: Quiz has query filter
        });

        // ── Explanation ────────────────────────────────────────────────────────
        // FIX: Source has a soft-delete query filter; make the FK optional.
        modelBuilder.Entity<Explanation>(b =>
        {
            b.ToTable("explanation");
            b.HasOne(e => e.User)
             .WithMany()
             .HasForeignKey(e => e.UserId)
             .OnDelete(DeleteBehavior.SetNull);
            b.HasOne(e => e.Source)
             .WithMany()
             .HasForeignKey(e => e.SourceId)
             .IsRequired(false)              // ← suppresses WRN: Source has query filter
             .OnDelete(DeleteBehavior.Cascade);
            b.Property(e => e.AuthorType)
             .HasConversion<string>()
             .HasMaxLength(10);
        });

        // ── UserSourceProgress ─────────────────────────────────────────────────
        // FIX: Source has a soft-delete query filter; make the FK optional.
        modelBuilder.Entity<Features.Progress.UserSourceProgress>(b =>
        {
            b.ToTable("user_source_progress");
            b.HasIndex(p => new { p.UserId, p.SourceId }).IsUnique();
            b.HasOne(p => p.User)
             .WithMany()
             .HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(p => p.Source)
             .WithMany()
             .HasForeignKey(p => p.SourceId)
             .IsRequired(false)              // ← suppresses WRN: Source has query filter
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── FavoriteItem ───────────────────────────────────────────────────────
        modelBuilder.Entity<Features.Favorite.FavoriteItem>(b =>
        {
            b.ToTable("favorite_item");
            b.HasOne(f => f.User)
             .WithMany()
             .HasForeignKey(f => f.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            b.Property(f => f.Type)
             .HasMaxLength(20)
             .HasDefaultValue("word");
        });

        // ── Comment ─────────────────────────────────────────────────────
        modelBuilder.Entity<Comment>(b =>
        {
            b.ToTable("comment");
            b.HasKey(c => c.Id);
            b.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(c => c.Parent)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Cascade);
            b.Property(c => c.TargetType).HasMaxLength(20);
            b.HasIndex(c => new { c.TargetType, c.TargetId });
            b.HasQueryFilter(c => c.DeletedAt == null); // soft delete filter
        });

        // ── Report ─────────────────────────────────────────────────────
        modelBuilder.Entity<Report>(b =>
        {
            b.ToTable("report");
            b.HasKey(r => r.Id);

            // User who created the report
            b.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Admin who resolved the report
            b.HasOne(r => r.Resolver)
                .WithMany()
                .HasForeignKey(r => r.ResolvedBy)
                .OnDelete(DeleteBehavior.SetNull);

            b.Property(r => r.TargetType).HasMaxLength(20);
            b.HasIndex(r => new { r.TargetType, r.TargetId });
            b.HasIndex(r => r.Resolved);
        });

        // ── AdminLog ───────────────────────────────────────────────────
        modelBuilder.Entity<AdminLog>(b =>
        {
            b.ToTable("admin_log");
            b.HasKey(l => l.Id);
            b.HasOne(l => l.Admin)
                .WithMany()
                .HasForeignKey(l => l.AdminId)
                .OnDelete(DeleteBehavior.Cascade);
            b.Property(l => l.TargetType).HasMaxLength(20);
            b.HasIndex(l => l.CreatedAt);
        });

        modelBuilder.Entity<Features.Metrics.MetricEntry>(b =>
        {
            b.ToTable("metrics");
            b.HasKey(m => m.Id);
            b.HasIndex(m => new { m.Name, m.Timestamp });
        });
    }
}