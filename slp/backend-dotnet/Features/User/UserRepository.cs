using backend_dotnet.Data;
using backend_dotnet.Features.Dashboard;
using backend_dotnet.Features.User;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.User;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetByIdAsync(int id)   // matches interface
    {
        return await _db.Users.FindAsync(id);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _db.Users.FirstOrDefaultAsync(x => x.Email == email);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _db.Users.FirstOrDefaultAsync(x => x.Username == username);
    }

    public async Task<User?> GetByResetTokenAsync(string token)
    {
        return await _db.Users.FirstOrDefaultAsync(x => x.PasswordResetToken == token);
    }

    public async Task<User?> GetByEmailVerificationTokenAsync(string token)
    {
        return await _db.Users.FirstOrDefaultAsync(x => x.EmailVerificationToken == token);
    }

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }

    public async Task CreateAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(User user)
    {
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<User>> GetAllAsync(string? search = null)
    {
        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, pattern) ||
                EF.Functions.ILike(u.Email, pattern));
        }
        return await query.OrderBy(u => u.Id).ToListAsync();
    }

    public async Task<UserStatsDto> GetUserStatsAsync(int userId)
    {
        var quizCount = await _db.Quizzes
            .Where(q => q.UserId == userId && !q.Disabled)
            .CountAsync();

        var questionCount = await _db.Questions
            .Where(q => q.UserId == userId)
            .CountAsync();

        var sourceCount = await _db.Sources
            .Where(s => s.UserId == userId && s.DeletedAt == null)
            .CountAsync();

        var favoriteCount = await _db.FavoriteItems
            .Where(f => f.UserId == userId)
            .CountAsync();

        return new UserStatsDto
        {
            QuizCount = quizCount,
            QuestionCount = questionCount,
            SourceCount = sourceCount,
            FavoriteCount = favoriteCount
        };
    }
}