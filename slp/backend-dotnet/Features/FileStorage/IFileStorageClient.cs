namespace backend_dotnet.Features.FileStorage;

public interface IFileStorageClient
{
    /// <summary>
    /// Uploads raw image bytes to the file-storage microservice.
    /// </summary>
    /// <returns>The bare filename assigned by the service (e.g. "a3f9c1.jpg").</returns>
    Task<string> UploadAvatarAsync(byte[] data, string contentType, string originalFileName);

    /// <summary>
    /// Deletes a previously uploaded file by its bare filename (e.g. "a3f9c1.jpg").
    /// </summary>
    Task DeleteFileAsync(string filename);
}