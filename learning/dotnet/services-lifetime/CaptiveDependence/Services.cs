public interface IMyScopedService { Guid Id { get; } }

public class MyScopedService : IMyScopedService 
{
    public Guid Id { get; } = Guid.NewGuid();
    public MyScopedService() => Console.WriteLine($"---> Scoped Service Created: {Id}");
}

// This Singleton will "capture" the Scoped service
public class MySingletonService
{
    private readonly IMyScopedService _scoped;
    public MySingletonService(IMyScopedService scoped) 
    {
        _scoped = scoped;
    }

    public void CheckId() => Console.WriteLine($"Singleton says Scoped ID is: {_scoped.Id}");
}