import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SessionGuard } from '../session/session.guard';
import { SourceService } from './source.service';
import { ProgressService } from './progress.service';
import {
  SourceQueryParams,
  UploadSourceRequest,
  UrlSourceDto,
  CreateNoteSourceRequest,
  UpdateProgressRequest,
} from './source.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('source')
@Controller('api/source')
@UseGuards(SessionGuard)
export class SourceController {
  constructor(
    private readonly sourceService: SourceService,
    private readonly progressService: ProgressService,
  ) {}

  private getUserIdFromRequest(req: any): number {
    return req.user?.id;
  }

  private isAdmin(req: any): boolean {
    return req.user?.role === 'admin';
  }

  @Get()
  async getMySources(@Request() req, @Query() query: SourceQueryParams) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    return this.sourceService.getUserSources(userId, query);
  }

  @Get(':id')
  async getSource(@Request() req, @Param('id') id: string) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const source = await this.sourceService.getSourceById(parseInt(id), userId);
    if (!source) return { error: 'Not found' };
    return source;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadSourceRequest })
  async uploadSource(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const result = await this.sourceService.uploadSource(userId, file, title);
    return result;
  }

  @Post('url')
  async createFromUrl(@Request() req, @Body() dto: UrlSourceDto) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const result = await this.sourceService.createSourceFromUrl(userId, dto.url, dto.title);
    return result;
  }

  @Post('note')
  async createFromNote(@Request() req, @Body() dto: CreateNoteSourceRequest) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const result = await this.sourceService.createTextSource(userId, dto.title, dto.content);
    return result;
  }

  @Delete(':id')
  async deleteSource(@Request() req, @Param('id') id: string) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const deleted = await this.sourceService.deleteSource(
      parseInt(id),
      userId,
      this.isAdmin(req),
    );
    if (!deleted) return { error: 'Not found' };
    return { success: true };
  }

  // Progress endpoints
  @Get(':id/progress')
  async getProgress(@Request() req, @Param('id') id: string) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const source = await this.sourceService.getSourceById(parseInt(id), userId);
    if (!source) return { error: 'Not found' };
    const progress = await this.progressService.getProgress(userId, parseInt(id));
    return progress;
  }

  @Put(':id/progress')
  async updateProgress(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProgressRequest,
  ) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) throw new BadRequestException('User not authenticated');
    const source = await this.sourceService.getSourceById(parseInt(id), userId);
    if (!source) return { error: 'Not found' };
    const updated = await this.progressService.updateProgress(userId, parseInt(id), dto);
    return updated;
  }
}