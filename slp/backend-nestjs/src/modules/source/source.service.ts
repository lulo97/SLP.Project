import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { SourceRepository } from "./source.repository";
import { Source } from "./source.entity";
import { ParserClient, ParseResult } from "./parser-client.service";
import {
  SourceDto,
  SourceListDto,
  SourceQueryParams,
  UploadSourceRequest,
  UrlSourceDto,
  CreateNoteSourceRequest,
} from "./source.dto";
import { PaginatedResult } from "../../helpers/pagination.helper";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import * as fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class SourceService {
  private readonly logger = new Logger(SourceService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly sourceRepo: SourceRepository,
    private readonly parserClient: ParserClient,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = path.join(
      this.configService.get("app.uploadPath") || process.cwd() + "/uploads",
    );
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  private mapToDto(source: Source): SourceDto {
    return {
      id: source.id,
      userId: source.userId,
      type: source.type,
      title: source.title,
      url: source.url,
      rawText: source.rawText,
      contentJson: source.contentJson,
      filePath: source.filePath,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      metadata: source.metadataJson,
    };
  }

  private mapToListDto(source: Source): SourceListDto {
    return {
      id: source.id,
      type: source.type,
      title: source.title,
      url: source.url,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }

  async getSourceById(
    id: number,
    currentUserId: number,
  ): Promise<SourceDto | null> {
    const source = await this.sourceRepo.getById(id);
    if (!source || source.userId !== currentUserId) {
      return null;
    }
    return this.mapToDto(source);
  }

  async getUserSources(
    userId: number,
    query: SourceQueryParams,
  ): Promise<PaginatedResult<SourceListDto>> {
    const { items, total } = await this.sourceRepo.getUserSources(
      userId,
      query,
    );
    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const totalPages = Math.ceil(total / pageSize);
    return {
      items: items.map(this.mapToListDto),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async uploadSource(
    userId: number,
    file: Express.Multer.File,
    title?: string,
  ): Promise<SourceDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded.");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException("File too large (max 20MB).");
    }

    // Save file to disk
    const ext = path.extname(file.originalname).slice(1);
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    // Parse file
    let parseResult: ParseResult;
    try {
      parseResult = await this.parserClient.parseFile(
        file.buffer,
        file.originalname,
        title,
      );
    } catch (err) {
      // Clean up saved file if parsing fails
      await fs.unlink(filePath).catch(() => {});
      throw err;
    }

    // Determine source type based on extension
    const extensionMap: Record<string, string> = {
      pdf: "pdf",
      txt: "text",
      html: "text",
      htm: "text",
      md: "text",
      epub: "text",
    };
    const sourceType = extensionMap[ext.toLowerCase()] || "text";

    const source = new Source();
    source.userId = userId;
    source.type = sourceType;
    source.title = parseResult.title || title || file.originalname;
    source.filePath = filePath;
    source.rawText = parseResult.rawText;
    source.rawHtml = parseResult.rawHtml ?? null;
    source.contentJson = parseResult.contentJson
      ? JSON.stringify(parseResult.contentJson)
      : null;
    source.metadataJson = parseResult.metadata
      ? JSON.stringify(parseResult.metadata)
      : null;

    const created = await this.sourceRepo.create(source);
    return this.mapToDto(created);
  }

  async createSourceFromUrl(
    userId: number,
    url: string,
    title?: string,
  ): Promise<SourceDto> {
    const parseResult = await this.parserClient.parseUrl(url, title);

    const source = new Source();
    source.userId = userId;
    source.type = "link";
    source.title = title || parseResult.title || url;
    source.url = url;
    source.rawText = parseResult.rawText;
    source.rawHtml = parseResult.rawHtml ?? null;
    source.contentJson = parseResult.contentJson
      ? JSON.stringify(parseResult.contentJson)
      : null;
    source.metadataJson = parseResult.metadata
      ? JSON.stringify(parseResult.metadata)
      : null;

    const created = await this.sourceRepo.create(source);
    return this.mapToDto(created);
  }

  async createTextSource(
    userId: number,
    title: string,
    content: string,
  ): Promise<SourceDto> {
    if (!title || !content) {
      throw new BadRequestException("Title and content are required.");
    }

    const source = new Source();
    source.userId = userId;
    source.type = "text";
    source.title = title;
    source.rawText = content;

    const created = await this.sourceRepo.create(source);
    return this.mapToDto(created);
  }

  async deleteSource(
    id: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const source = await this.sourceRepo.getById(id);
    if (!source) return false;
    if (!isAdmin && source.userId !== userId) return false;

    await this.sourceRepo.softDelete(id);

    // Delete physical file if exists
    if (source.filePath) {
      try {
        await fs.unlink(source.filePath);
      } catch (err) {
        this.logger.warn(`Failed to delete file: ${source.filePath}`, err);
      }
    }

    return true;
  }
}
