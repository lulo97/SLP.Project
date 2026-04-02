namespace backend_dotnet.Features.FileStorage;

public sealed class FileStorageSettings
{
    /// <summary>Base URL of the filestorage microservice (e.g. http://filestorage:8090).</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Shared API key required by the filestorage service for mutating operations.</summary>
    public string ApiKey { get; set; } = string.Empty;
}