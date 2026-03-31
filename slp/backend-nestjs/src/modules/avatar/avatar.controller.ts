import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  NotFoundException,
  Logger,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SessionGuard } from "../session/session.guard";
import { UserRepository } from "../user/user.repository";
import { FileStorageService } from "../file-storage/file-storage.service";
import { ConfigService } from "@nestjs/config";
import { AvatarResponseDto } from "./dto/avatar-response.dto";

@Controller("api/avatar")
@UseGuards(SessionGuard)
export class AvatarController {
  private readonly logger = new Logger(AvatarController.name);
  private readonly allowedMime = new Set(["image/jpeg", "image/png"]);
  private readonly maxBytes = 2 * 1024 * 1024; // 2 MB
  private readonly frontendBaseUrl: string;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly fileStorage: FileStorageService,
    private readonly configService: ConfigService,
  ) {
    this.frontendBaseUrl =
      this.configService.get<string>("fileStorage.baseUrlFrontend") || "";
  }

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<AvatarResponseDto> {
    const userId = req.user.id;

    // Validation
    if (!file) {
      throw new BadRequestException("No file provided.");
    }
    if (!this.allowedMime.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        "Only JPEG and PNG images are allowed.",
      );
    }
    if (file.size > this.maxBytes) {
      throw new PayloadTooLargeException("File exceeds the 2 MB limit.");
    }

    // Get user
    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    // Delete old avatar (best-effort)
    if (user.avatarFilename) {
      try {
        await this.fileStorage.deleteFileAsync(user.avatarFilename);
      } catch (err) {
        this.logger.warn(
          `Could not delete previous avatar for user ${userId}`,
          err,
        );
      }
    }

    // Upload new file
    let newFilename: string;
    try {
      newFilename = await this.fileStorage.uploadAvatarAsync(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    } catch (err) {
      this.logger.error(`Avatar upload failed for user ${userId}`, err);
      throw err; // already handled by service
    }

    // Update user
    user.avatarFilename = newFilename;
    user.updatedAt = new Date();
    await this.userRepo.update(user);

    // Build public URL
    const avatarUrl = `${this.frontendBaseUrl.endsWith("/") ? this.frontendBaseUrl.slice(0, -1) : this.frontendBaseUrl}/files/${newFilename}`;
    return { avatarUrl };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@Request() req): Promise<void> {
    const userId = req.user.id;
    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (user.avatarFilename) {
      try {
        await this.fileStorage.deleteFileAsync(user.avatarFilename);
      } catch (err) {
        this.logger.warn(`Could not delete avatar for user ${userId}`, err);
      }

      user.avatarFilename = undefined;
      user.updatedAt = new Date();
      await this.userRepo.update(user);
    }
    // NoContent
  }
}
