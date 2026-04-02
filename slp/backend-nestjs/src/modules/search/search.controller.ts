import { Controller, Get, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { SessionGuard } from '../session/session.guard';

@ApiTags('search')
@ApiBearerAuth('session-token')
@Controller('api/search')
@UseGuards(SessionGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiResponse({ status: 200, type: SearchResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or invalid query' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(
    @Query() queryDto: SearchRequestDto,
    @Req() req: any,
  ): Promise<SearchResponseDto> {
    // Trim and validate q
    const q = queryDto.q?.trim();
    if (!q || q.length === 0) {
      throw new BadRequestException('Query parameter "q" is required and must not be empty.');
    }

    const userId = req.user.id; // guaranteed number by SessionGuard
    const type = queryDto.type ?? 'all';
    const page = Math.max(1, queryDto.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, queryDto.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    return this.searchService.search({
      q,
      type,
      page,
      pageSize,
      offset,
      userId,
    });
  }
}