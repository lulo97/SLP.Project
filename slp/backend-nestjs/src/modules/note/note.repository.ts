import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Note } from './note.entity';
import { PaginatedResult } from '../../helpers/pagination.helper';

@Injectable()
export class NoteRepository extends Repository<Note> {
  constructor(private dataSource: DataSource) {
    super(Note, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Note | null> {
    return this.findOne({ where: { id } });
  }

  async getUserNotes(
    userId: number,
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaginatedResult<Note>> {
    const query = this.createQueryBuilder('note')
      .where('note.userId = :userId', { userId });

    if (search && search.trim()) {
      const lower = search.toLowerCase();
      query.andWhere(
        '(LOWER(note.title) LIKE :search OR LOWER(note.content) LIKE :search)',
        { search: `%${lower}%` },
      );
    }

    const total = await query.getCount();
    const items = await query
      .orderBy('note.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    const newNote = this.create(note);
    return this.save(newNote);
  }

  async updateNote(id: number, updates: Partial<Note>): Promise<void> {
    // Note: TypeORM's update doesn't trigger @UpdateDateColumn automatically in some versions
    // so manual updatedAt is fine, or just rely on the entity decorator.
    await this.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await this.delete(id);
    // Fix for Error 18047: Ensure we handle potential null/undefined
    return !!(result && result.affected && result.affected > 0);
  }

  // Fix for Error 2416: Renamed to avoid conflict with base Repository.exists
  async existsById(id: number): Promise<boolean> {
    const count = await this.count({ where: { id } });
    return count > 0;
  }
}