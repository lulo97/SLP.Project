import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { NoteService } from './note.service';
import { SessionGuard } from '../session/session.guard';
import { CreateNoteRequest } from './dto/create-note-request.dto';
import { UpdateNoteRequest } from './dto/update-note-request.dto';
import { NoteDto } from './dto/note.dto';
import { PaginatedResult } from '../../helpers/pagination.helper';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('notes')
@ApiBearerAuth('session-token')
@Controller('api/notes')
@UseGuards(SessionGuard)
export class NotesController {
  constructor(private noteService: NoteService) {}

  @Get()
  async getMyNotes(
    @Req() req,
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResult<NoteDto>> {
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 10;
    return this.noteService.getUserNotes(req.user.id, search, pageNum, pageSizeNum);
  }

  @Get(':id')
  async getNote(@Param('id') id: string, @Req() req): Promise<NoteDto> {
    const note = await this.noteService.getNoteById(parseInt(id, 10), req.user.id);
    if (!note) throw new NotFoundException();
    return note;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Body() createDto: CreateNoteRequest,
    @Req() req,
    @Res() res: Response,
  ): Promise<void> {
    const note = await this.noteService.createNote(req.user.id, createDto.title, createDto.content);
    res.location(`/api/notes/${note.id}`);
    res.status(HttpStatus.CREATED).json(note);
  }

  @Put(':id')
  async updateNote(
    @Param('id') id: string,
    @Body() updateDto: UpdateNoteRequest,
    @Req() req,
  ): Promise<NoteDto> {
    const updated = await this.noteService.updateNote(
      parseInt(id, 10),
      req.user.id,
      updateDto.title,
      updateDto.content,
    );
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNote(@Param('id') id: string, @Req() req): Promise<void> {
    const deleted = await this.noteService.deleteNote(parseInt(id, 10), req.user.id);
    if (!deleted) throw new NotFoundException();
  }
}