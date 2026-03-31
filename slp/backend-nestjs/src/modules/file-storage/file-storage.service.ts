import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { IFileStorageClient } from './interfaces/file-storage-client.interface';

@Injectable()
export class FileStorageService implements IFileStorageClient {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('fileStorage.baseUrl') || '';
    this.apiKey = this.configService.get<string>('fileStorage.apiKey') || '';
    if (!this.baseUrl) {
      this.logger.warn('FileStorage base URL is not configured');
    }
  }

  async uploadAvatarAsync(
    data: Buffer,
    contentType: string,
    originalFileName: string,
  ): Promise<string> {
    const form = new FormData();
    form.append('file', data, {
      filename: originalFileName,
      contentType,
    });

    const url = `${this.baseUrl}/upload`;
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, form, {
          headers: {
            ...form.getHeaders(),
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const filename = response.data?.filename;
      if (!filename) {
        throw new Error('Missing filename in response');
      }
      return filename;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw new HttpException(
        'File storage service error. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async deleteFileAsync(filename: string): Promise<void> {
    if (!filename) return;
    const url = `${this.baseUrl}/files/${encodeURIComponent(filename)}`;
    try {
      await firstValueFrom(
        this.httpService.delete(url, {
          headers: { 'X-API-Key': this.apiKey },
        }),
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status !== HttpStatus.NOT_FOUND) {
        this.logger.warn(
          `Delete failed for ${filename}: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}