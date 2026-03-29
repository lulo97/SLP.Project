import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FavoriteRepository } from './favorite.repository';
import { FavoriteItem } from './favorite-item.entity';
import { FavoriteDto } from './dto/favorite.dto';
import { CreateFavoriteRequest } from './dto/create-favorite.request.dto';
import { UpdateFavoriteRequest } from './dto/update-favorite.request.dto';
import { PaginatedResult } from './dto/paginated-result.dto';

const ALLOWED_TYPES = new Set(['word', 'phrase', 'idiom', 'other']);

@Injectable()
export class FavoriteService {
  constructor(private readonly repository: FavoriteRepository) {}

  private mapToDto(entity: FavoriteItem): FavoriteDto {
    return {
      id: entity.id,
      text: entity.text,
      type: entity.type,
      note: entity.note,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async getById(id: number, userId: number): Promise<FavoriteDto | null> {
    const entity = await this.repository.getById(id);
    if (!entity || entity.userId !== userId) return null;
    return this.mapToDto(entity);
  }

  async getUserFavorites(
    userId: number,
    search?: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedResult<FavoriteDto>> {
    const paginated = await this.repository.getByUser(userId, search, page, pageSize);
    return {
      items: paginated.items.map(this.mapToDto),
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
    };
  }

  async create(userId: number, request: CreateFavoriteRequest): Promise<FavoriteDto> {
    if (!request.text || request.text.trim().length === 0) {
      throw new BadRequestException('Text is required.');
    }

    let type = request.type?.toLowerCase() ?? 'word';
    if (!ALLOWED_TYPES.has(type)) type = 'other';

    const newItem = new FavoriteItem();
    newItem.userId = userId;
    newItem.text = request.text.trim();
    newItem.type = type;
    newItem.note = request.note?.trim() || null;
    newItem.createdAt = new Date();
    newItem.updatedAt = new Date();

    const created = await this.repository.create(newItem);
    return this.mapToDto(created);
  }

  async update(
    id: number,
    userId: number,
    request: UpdateFavoriteRequest,
  ): Promise<FavoriteDto | null> {
    const entity = await this.repository.getById(id);
    if (!entity || entity.userId !== userId) return null;

    if (request.text && request.text.trim().length > 0) {
      entity.text = request.text.trim();
    }
    if (request.type !== undefined) {
      let type = request.type.toLowerCase();
      if (!ALLOWED_TYPES.has(type)) type = 'other';
      entity.type = type;
    }
    if (request.note !== undefined) {
      entity.note = request.note.trim() || null;
    }

    const updated = await this.repository.update(entity);
    return this.mapToDto(updated);
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const entity = await this.repository.getById(id);
    if (!entity || entity.userId !== userId) return false;

    await this.repository.delete(id);
    return true;
  }
}