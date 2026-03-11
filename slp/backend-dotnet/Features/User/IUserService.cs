using backend_dotnet.Features.Auth;

namespace backend_dotnet.Features.User
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(string id);
        Task<User> UpdateAsync(string id, UpdateUserRequest request);
    }
}