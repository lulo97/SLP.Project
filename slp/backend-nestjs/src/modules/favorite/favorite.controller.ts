import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteRequest } from './dto/create-favorite.request.dto';
import { UpdateFavoriteRequest } from './dto/update-favorite.request.dto';

// Helper to extract user ID from the authenticated request.
// Assumes your JWT strategy attaches a `user` object with an `id` property.
const getCurrentUserId = (req: Request): number | null => {
  const user = (req as any).user;
  return user?.id ?? null;
};

@Controller('api/favorites')
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const userId = getCurrentUserId(req);
    if (!userId) throw new UnauthorizedException();

    const item = await this.service.getById(+id, userId);
    if (!item) throw new NotFoundException();
    return item;
  }

  @Get()
  async getAll(
    @Query('search') search: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Req() req: Request,
  ) {
    const userId = getCurrentUserId(req);
    if (!userId) throw new UnauthorizedException();

    const result = await this.service.getUserFavorites(
      userId,
      search,
      +page,
      +pageSize,
    );
    return result;
  }

  @Post()
  async create(@Body() request: CreateFavoriteRequest, @Req() req: Request) {
    const userId = getCurrentUserId(req);
    if (!userId) throw new UnauthorizedException();

    try {
      const created = await this.service.create(userId, request);
      return created;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid request');
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() request: UpdateFavoriteRequest,
    @Req() req: Request,
  ) {
    const userId = getCurrentUserId(req);
    if (!userId) throw new UnauthorizedException();

    const updated = await this.service.update(+id, userId, request);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = getCurrentUserId(req);
    if (!userId) throw new UnauthorizedException();

    const deleted = await this.service.delete(+id, userId);
    if (!deleted) throw new NotFoundException();
  }
}