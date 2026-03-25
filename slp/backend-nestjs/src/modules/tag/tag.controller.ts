import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SessionGuard } from '../../common/guards/session.guard';
import { TagService } from './tag.service';
import { TagDto, TagListResponse } from './dto/tag.dto';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('api/tags')
@UseGuards(SessionGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiQuery({ name: 'q', required: false, description: 'Filter tags by name (case‑insensitive contains)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['usage', 'name'], description: 'Sort by total usage or name' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, type: TagListResponse })
  async getTags(
    @Query('q') q?: string,
    @Query('sort') sort: 'usage' | 'name' = 'usage',
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
  ): Promise<TagListResponse> {
    return this.tagService.getTags(q, sort, page, pageSize);
  }

  @Get('popular')
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: [TagDto] })
  async getPopularTags(@Query('limit') limit = 20): Promise<TagDto[]> {
    return this.tagService.getPopularTags(limit);
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true, description: 'Search term (at least 1 character)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, type: [TagDto] })
  @ApiResponse({ status: 400, description: 'Missing query parameter q' })
  async searchTags(
    @Query('q') q: string,
    @Query('limit') limit = 10,
  ): Promise<TagDto[]> {
    if (!q) {
      throw new BadRequestException('Query parameter "q" is required.');
    }
    return this.tagService.searchTags(q, limit);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: TagDto })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async getTag(@Param('id') id: number): Promise<TagDto> {
    try {
      return await this.tagService.getTagById(id);
    } catch (error) {
      if (error.message === 'Tag not found') {
        throw new NotFoundException('Tag not found');
      }
      throw error;
    }
  }
}