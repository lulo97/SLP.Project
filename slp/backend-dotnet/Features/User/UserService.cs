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

    public async Task<User> RegisterAsync(RegisterUserRequest request)
    {
        var existing = await _users.GetByEmailAsync(request.Email);
        if (existing != null)
            throw new Exception("Email already exists");

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = PasswordHasher.Hash(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Role = "user",
            Status = "active"
        };

        await _users.CreateAsync(user);

        return user;
    }

    public async Task<bool> DeleteAsync(int userId)
    {
        var user = await _users.GetByIdAsync(userId);

        if (user == null)
            return false;

        await _users.DeleteAsync(user);

        return true;
    }
}