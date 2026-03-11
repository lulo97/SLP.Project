using backend_dotnet.Features.Auth;

namespace backend_dotnet.Features.User;

public class UserService : IUserService
{
    private readonly IUserRepository _users;

    public UserService(IUserRepository users)
    {
        _users = users;
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        if (!int.TryParse(id, out var userId))
            return null;

        return await _users.GetByIdAsync(userId);
    }

    public async Task<User?> UpdateAsync(string id, UpdateUserRequest request)
    {
        if (!int.TryParse(id, out var userId))
            return null;

        var user = await _users.GetByIdAsync(userId);

        if (user == null)
            return null;

        user.Username = request.Name;
        // AvatarUrl is ignored for now; extend as needed

        await _users.UpdateAsync(user);

        return user;
    }
}