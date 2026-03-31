using backend_dotnet.Features.Dashboard;

namespace backend_dotnet.Features.User
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByResetTokenAsync(string token);
        Task<User?> GetByEmailVerificationTokenAsync(string token);

        Task UpdateAsync(User user);
        Task CreateAsync(User user);
        Task DeleteAsync(User user);
        Task<(IEnumerable<User> Items, int TotalCount)> GetAllAsync(string? search, int page, int pageSize);
        Task<UserStatsDto> GetUserStatsAsync(int userId);
    }
}