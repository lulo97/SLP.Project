var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<UserSessionStore>();

var app = builder.Build();

app.MapControllers();

app.MapGet("/", () => "Hello World!");

app.Run();

/*
[1] Alice is logging in...
    System: User Alice successfully set in session.
[2] Alice checks her private data:
    Response: Showing private data for user: Alice

[3] Bob logs in from a different location...
    System: User Bob successfully set in session.
[4] Alice refreshes her page (checking data again):
    Response: Showing private data for user: Bob
*/