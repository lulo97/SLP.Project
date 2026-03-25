import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { QuestionRepository } from './question.repository';
import { TagService } from '../tag/tag.service';
import { Question } from './question.entity';
import { QuestionTag } from './question-tag.entity';
import { QuestionDto, QuestionListDto } from './dto/question.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionSearchDto } from './dto/question-search.dto';
import { PaginatedResult, paginate } from '../../helpers/pagination.helper';
import { QuestionValidationHelper } from './question-validation.helper';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepo: QuestionRepository,
    private tagService: TagService,
  ) {}

  async getQuestionById(id: number): Promise<QuestionDto | null> {
    const question = await this.questionRepo.findById(id);
    return question ? this.mapToDto(question) : null;
  }

  async getUserQuestions(userId: number): Promise<QuestionListDto[]> {
    const questions = await this.questionRepo.findByUserId(userId);
    return questions.map(q => this.mapToListDto(q));
  }

  async getAllQuestions(): Promise<QuestionListDto[]> {
    const questions = await this.questionRepo.findAll();
    return questions.map(q => this.mapToListDto(q));
  }

  async createQuestion(userId: number, dto: CreateQuestionDto): Promise<QuestionDto> {
    // Validate metadata
    QuestionValidationHelper.validateQuestionMetadata(dto.type, dto.content, dto.metadataJson);

    const question = new Question();
    question.userId = userId;
    question.type = dto.type;
    question.content = dto.content;
    question.explanation = dto.explanation ?? null;
    question.metadataJson = dto.metadataJson ?? null;
    question.createdAt = new Date();
    question.updatedAt = new Date();

    if (dto.tagNames && dto.tagNames.length > 0) {
      const tags = await this.tagService.getOrCreateTags(dto.tagNames);
      question.questionTags = tags.map(tag => {
        const qt = new QuestionTag();
        qt.tagId = tag.id;
        return qt;
      });
    } else {
      question.questionTags = [];
    }

    const created = await this.questionRepo.createQuestion(question);
    return this.mapToDto(created);
  }

  async updateQuestion(id: number, userId: number, dto: UpdateQuestionDto): Promise<QuestionDto | null> {
    const question = await this.questionRepo.findById(id);
    if (!question) return null;
    if (question.userId !== userId) throw new ForbiddenException('You are not the owner of this question');

    // Determine effective type and content for validation
    const effectiveType = dto.type ?? question.type;
    const effectiveContent = dto.content ?? question.content;

    if (dto.metadataJson !== undefined) {
      QuestionValidationHelper.validateQuestionMetadata(effectiveType, effectiveContent, dto.metadataJson);
    }

    if (dto.type) question.type = dto.type;
    if (dto.content) question.content = dto.content;
    if (dto.explanation !== undefined) question.explanation = dto.explanation;
    if (dto.metadataJson !== undefined) question.metadataJson = dto.metadataJson;

    if (dto.tagNames) {
      await this.questionRepo.removeQuestionTags(question.id);
      const tags = await this.tagService.getOrCreateTags(dto.tagNames);
      question.questionTags = tags.map(tag => {
        const qt = new QuestionTag();
        qt.tagId = tag.id;
        return qt;
      });
    }

    const updated = await this.questionRepo.updateQuestion(question);
    return this.mapToDto(updated);
  }

  async deleteQuestion(id: number, userId: number, isAdminUser: boolean): Promise<boolean> {
    const question = await this.questionRepo.findById(id);
    if (!question) return false;
    if (!isAdminUser && question.userId !== userId) return false;
    await this.questionRepo.deleteQuestion(id);
    return true;
  }

  async searchQuestions(search: QuestionSearchDto, page: number = 1, pageSize: number = 20): Promise<PaginatedResult<QuestionListDto>> {
    const { items, totalCount } = await this.questionRepo.search(
      search.searchTerm,
      search.type,
      search.tags,
      search.userId,
      page,
      pageSize,
    );
    const dtos = items.map(q => this.mapToListDto(q));
    return paginate(dtos, totalCount, page, pageSize);
  }

  // Mapping helpers
  private mapToDto(q: Question): QuestionDto {
    return {
      id: q.id,
      userId: q.userId,
      type: q.type,
      content: q.content,
      explanation: q.explanation,
      metadataJson: q.metadataJson,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      tags: q.questionTags?.map(qt => qt.tag?.name).filter(Boolean) ?? [],
      userName: q.user?.username,
    };
  }

  private mapToListDto(q: Question): QuestionListDto {
    return {
      id: q.id,
      type: q.type,
      content: q.content,
      explanation: q.explanation,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      tags: q.questionTags?.map(qt => qt.tag?.name).filter(Boolean) ?? [],
      userName: q.user?.username,
      metadataJson: q.metadataJson,
    };
  }
}