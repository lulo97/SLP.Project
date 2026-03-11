namespace backend_dotnet.Features.User
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);           // was string

        Task<User?> GetByEmailAsync(string email);

        Task<User?> GetByResetTokenAsync(string token);

        Task<User?> GetByEmailVerificationTokenAsync(string token);

        Task UpdateAsync(User user);
    }
}