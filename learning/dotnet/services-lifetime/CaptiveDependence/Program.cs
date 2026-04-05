var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IMyScopedService, MyScopedService>();
builder.Services.AddSingleton<MySingletonService>(); // ILLEGAL INJECTION

var app = builder.Build();

app.MapGet("/", (MySingletonService singleton) => 
{
    singleton.CheckId();
    return "Check your console!";
});

app.Run();

/*
Unhandled exception. System.AggregateException: Some services are not able to be constructed (Error while validating the service descriptor 'ServiceType: MySingletonService Lifetime: Singleton ImplementationType: MySingletonService': Cannot consume scoped service 'IMyScopedService' from singleton 'MySingletonService'.)

Error = A scoped service can't be injected in a Singleton service, it will cause confict between a service designed to live between requests vs a service live for a request only
*/