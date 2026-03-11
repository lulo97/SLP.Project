using backend_dotnet.Features.Session;
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

        public async Task Invoke(HttpContext context, ISessionRepository sessions)
        {
            var token = context.Request.Headers["X-Session-Token"].FirstOrDefault();

            if (!string.IsNullOrEmpty(token))
            {
                var hash = SessionTokenService.HashToken(token);

                var session = await sessions.GetByTokenHashAsync(hash);

                if (session != null && !session.Revoked && session.ExpiresAt > DateTime.UtcNow)
                {
                    var claims = new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, session.UserId.ToString()),
                        new Claim("session_id", session.Id)
                    };

                    var identity = new ClaimsIdentity(claims, "session");

                    context.User = new ClaimsPrincipal(identity);
                }
            }

            await _next(context);
        }
    }
}