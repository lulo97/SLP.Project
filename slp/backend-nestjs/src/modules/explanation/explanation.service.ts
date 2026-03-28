import { Injectable } from "@nestjs/common";
import { ExplanationRepository } from "./explanation.repository";
import { SourceRepository } from "../source/source.repository";
import { Explanation } from "./explanation.entity";
import { CreateExplanationRequest } from "./dto/create-explanation-request.dto";
import { ExplanationDto } from "./dto/explanation.dto";
import { UpdateExplanationRequest } from "./dto/update-explanation-request.dto";

@Injectable()
export class ExplanationService {
  constructor(
    private readonly explanationRepo: ExplanationRepository,
    private readonly sourceRepo: SourceRepository,
  ) {}

  private mapToDto(entity: Explanation): ExplanationDto {
    let textRange: any;
    try {
      textRange = JSON.parse(entity.textRangeJson);
    } catch {
      textRange = null;
    }
    return {
      id: entity.id,
      userId: entity.userId ?? undefined,
      sourceId: entity.sourceId,
      textRange,
      content: entity.content,
      authorType: entity.authorType,
      editable: entity.editable,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt ?? undefined,
    };
  }

  async getBySource(
    sourceId: number,
    userId: number,
  ): Promise<ExplanationDto[]> {
    // Verify source belongs to user
    const source = await this.sourceRepo.getById(sourceId);
    if (!source || source.userId !== userId) {
      return [];
    }

    const explanations = await this.explanationRepo.getBySourceId(
      sourceId,
      userId,
    );
    return explanations.map(this.mapToDto);
  }

  async create(
    userId: number,
    request: CreateExplanationRequest,
  ): Promise<ExplanationDto> {
    const textRangeJson = JSON.stringify(request.textRange ?? {});

    const entity = new Explanation();
    entity.userId = userId;
    entity.sourceId = request.sourceId;
    entity.textRangeJson = textRangeJson;
    entity.content = request.content;
    entity.authorType = "user";
    entity.editable = true;

    const created = await this.explanationRepo.create(entity);
    return this.mapToDto(created);
  }

  async update(
    id: number,
    userId: number,
    request: UpdateExplanationRequest,
  ): Promise<ExplanationDto | null> {
    const entity = await this.explanationRepo.getById(id);
    if (!entity) return null;

    // Only owner can edit, and only if editable
    if (entity.userId !== userId || !entity.editable) return null;

    entity.content = request.content;
    const updated = await this.explanationRepo.update(entity);
    return this.mapToDto(updated);
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const entity = await this.explanationRepo.getById(id);
    if (!entity) return false;
    if (entity.userId !== userId) return false;

    await this.explanationRepo.delete(id);
    return true;
  }
}
