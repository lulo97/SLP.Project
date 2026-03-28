import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SessionGuard } from '../session/session.guard';
import { User } from '../../common/decorators/user.decorator'; // your custom user decorator
import { ExplanationService } from './explanation.service';
import { CreateExplanationRequest } from './dto/create-explanation-request.dto';
import { UpdateExplanationRequest } from './dto/update-explanation-request.dto';

@Controller('api')
@UseGuards(SessionGuard)
export class ExplanationController {
  constructor(private readonly explanationService: ExplanationService) {}

  // GET /api/source/:sourceId/explanations
  @Get('source/:sourceId/explanations')
  async getBySource(@Param('sourceId') sourceId: string, @User() user: any) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    const items = await this.explanationService.getBySource(parseInt(sourceId), userId);
    return items;
  }

  // POST /api/explanations
  @Post('explanations')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() request: CreateExplanationRequest, @User() user: any) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    if (!request.content?.trim()) {
      throw new BadRequestException('Content is required.');
    }

    const created = await this.explanationService.create(userId, request);
    // Return 201 with the created object (no location header, but .NET uses CreatedAtAction)
    // To match exactly, you might return the object without a Location header.
    return created;
  }

  // PUT /api/explanations/:id
  @Put('explanations/:id')
  async update(
    @Param('id') id: string,
    @Body() request: UpdateExplanationRequest,
    @User() user: any,
  ) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    if (!request.content?.trim()) {
      throw new BadRequestException('Content is required.');
    }

    const result = await this.explanationService.update(parseInt(id), userId, request);
    if (!result) throw new NotFoundException();
    return result;
  }

  // DELETE /api/explanations/:id
  @Delete('explanations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @User() user: any) {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException();

    const deleted = await this.explanationService.delete(parseInt(id), userId);
    if (!deleted) throw new NotFoundException();
  }
}