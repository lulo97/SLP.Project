import { Injectable } from '@nestjs/common';
import { TagRepository } from './tag.repository';
import { Tag } from './tag.entity';

@Injectable()
export class TagService {
  constructor(private tagRepo: TagRepository) {}

  async getOrCreateTags(names: string[]): Promise<Tag[]> {
    return this.tagRepo.getOrCreateTags(names);
  }
}