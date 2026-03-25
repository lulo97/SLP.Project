import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from './tag.entity';

@Injectable()
export class TagRepository {
  constructor(
    @InjectRepository(Tag)
    private repo: Repository<Tag>,
  ) {}

  async getOrCreateTags(names: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];
    for (const name of names) {
      let tag = await this.repo.findOne({ where: { name } });
      if (!tag) {
        tag = this.repo.create({ name });
        tag = await this.repo.save(tag);
      }
      tags.push(tag);
    }
    return tags;
  }

  async removeQuestionTags(questionId: number): Promise<void> {
    // This is handled in QuestionRepository, but we keep method for consistency.
  }
}