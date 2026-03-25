import { Injectable, BadRequestException } from '@nestjs/common';
import { TagRepository } from './tag.repository';
import { TagDto, TagListResponse } from './dto/tag.dto';

@Injectable()
export class TagService {
  constructor(private tagRepo: TagRepository) {}

  async getTags(
    q?: string,
    sort: 'usage' | 'name' = 'usage',
    page: number = 1,
    pageSize: number = 50,
  ): Promise<TagListResponse> {
    // Validate pagination parameters
    page = Math.max(1, page);
    pageSize = Math.min(100, Math.max(1, pageSize));

    const { tags, total } = await this.tagRepo.getTags(q, sort, page, pageSize);
    return { tags, total };
  }

  async getPopularTags(limit: number = 20): Promise<TagDto[]> {
    limit = Math.min(100, Math.max(1, limit));
    return this.tagRepo.getPopularTags(limit);
  }

  async searchTags(q: string, limit: number = 10): Promise<TagDto[]> {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required.');
    }
    limit = Math.min(50, Math.max(1, limit));
    return this.tagRepo.searchTags(q, limit);
  }

  async getTagById(id: number): Promise<TagDto> {
    const tag = await this.tagRepo.findTagById(id);
    if (!tag) throw new Error('Tag not found'); // will be caught and transformed to 404
    return tag;
  }

  // keep existing methods for tag management
  async getOrCreateTags(names: string[]) {
    return this.tagRepo.getOrCreateTags(names);
  }
}