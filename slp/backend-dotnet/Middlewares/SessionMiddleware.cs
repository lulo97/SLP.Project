using backend_dotnet.Features.Session;
using backend_dotnet.Features.User;
using System.Security.Claims;

namespace backend_dotnet.Middlewares
{
    public class SessionMiddleware
    {
        private readonly RequestDelegate _next;

        public SessionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, ISessionRepository sessions, IUserRepository userRepository)
        {
            var token = context.Request.Headers["X-Session-Token"].FirstOrDefault();

            if (!string.IsNullOrEmpty(token))
            {
                var hash = SessionTokenService.HashToken(token);
                var session = await sessions.GetByTokenHashAsync(hash);

                if (session != null && !session.Revoked && session.ExpiresAt > DateTime.UtcNow)
                {
                    var user = await userRepository.GetByIdAsync(session.UserId);
                    if (user != null) // user might have been deleted
                    {
                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, session.UserId.ToString()),
                            new Claim("session_id", session.Id),
                            new Claim(ClaimTypes.Role, user.Role) // add role for admin authorization
                        };

                        var identity = new ClaimsIdentity(claims, "session");
                        context.User = new ClaimsPrincipal(identity);
                    }
                }
            }

            await _next(context);
        }
    }
}