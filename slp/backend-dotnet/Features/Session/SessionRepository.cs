using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Session;

public class SessionRepository : ISessionRepository
{
    private readonly AppDbContext _db;

    public SessionRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateAsync(Session session)
    {
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
    }

    public async Task<Session?> GetByTokenHashAsync(string hash)
    {
        return await _db.Sessions.FirstOrDefaultAsync(x => x.TokenHash == hash);
    }

    public async Task RevokeAsync(string sessionId)
    {
        var session = await _db.Sessions.FindAsync(sessionId);

        if (session == null)
            return;

        session.Revoked = true;

        await _db.SaveChangesAsync();
    }

    public async Task RevokeAllForUserAsync(int userId)
    {
        var sessions = await _db.Sessions
            .Where(s => s.UserId == userId && !s.Revoked)
            .ToListAsync();
        foreach (var session in sessions)
        {
            session.Revoked = true;
        }
        await _db.SaveChangesAsync();
    }
}