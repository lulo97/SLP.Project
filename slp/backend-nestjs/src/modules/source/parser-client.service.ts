import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

export interface ParseResult {
  title: string;
  rawText: string;
  rawHtml?: string;
  contentJson?: any;
  metadata?: any;
}

@Injectable()
export class ParserClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(ParserClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>("parserService.baseUrl") ?? "";
    if (!this.baseUrl) {
      throw new Error("Parser service base URL not configured");
    }
  }

  async parseUrl(url: string, title?: string): Promise<ParseResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/parse/url`, { url, title }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to parse URL: ${error.message}`);
      throw new HttpException("Failed to parse URL", HttpStatus.BAD_REQUEST);
    }
  }

  async parseFile(
    fileStream: Buffer,
    fileName: string,
    title?: string,
  ): Promise<ParseResult> {
    const formData = new FormData();

    // Convert Buffer to Uint8Array to satisfy BlobPart types
    const blob = new Blob([new Uint8Array(fileStream)]);
    formData.append("file", blob, fileName);

    if (title) formData.append("title", title);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/parse/file`, formData),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to parse file: ${error.message}`);
      throw new HttpException("Failed to parse file", HttpStatus.BAD_REQUEST);
    }
  }
}
