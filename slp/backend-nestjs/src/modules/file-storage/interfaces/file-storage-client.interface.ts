export interface IFileStorageClient {
  uploadAvatarAsync(data: Buffer, contentType: string, originalFileName: string): Promise<string>;
  deleteFileAsync(filename: string): Promise<void>;
}