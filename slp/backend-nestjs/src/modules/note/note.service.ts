import { Injectable } from '@nestjs/common';
import { NoteRepository } from './note.repository';
import { NoteDto } from './dto/note.dto';
import { PaginatedResult } from '../../helpers/pagination.helper';

@Injectable()
export class NoteService {
  constructor(private noteRepository: NoteRepository) {}

  private mapToDto(note: any): NoteDto {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  async getNoteById(id: number, userId: number): Promise<NoteDto | null> {
    const note = await this.noteRepository.getById(id);
    if (!note || note.userId !== userId) return null;
    return this.mapToDto(note);
  }

  async getUserNotes(
    userId: number,
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaginatedResult<NoteDto>> {
    const result = await this.noteRepository.getUserNotes(userId, search, page, pageSize);
    return {
      ...result,
      items: result.items.map(this.mapToDto),
    };
  }

  async createNote(userId: number, title: string, content: string): Promise<NoteDto> {
    const note = await this.noteRepository.createNote({ userId, title, content });
    return this.mapToDto(note);
  }

  async updateNote(id: number, userId: number, title: string, content: string): Promise<NoteDto | null> {
    const note = await this.noteRepository.getById(id);
    if (!note || note.userId !== userId) return null;
    await this.noteRepository.updateNote(id, { title, content });
    const updated = await this.noteRepository.getById(id);
    return this.mapToDto(updated);
  }

  async deleteNote(id: number, userId: number): Promise<boolean> {
    const note = await this.noteRepository.getById(id);
    if (!note || note.userId !== userId) return false;
    return this.noteRepository.deleteNote(id);
  }
}