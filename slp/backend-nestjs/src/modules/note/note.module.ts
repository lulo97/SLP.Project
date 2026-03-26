import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './note.entity';
import { NoteRepository } from './note.repository';
import { NoteService } from './note.service';
import { NotesController } from './note.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Note])],
  controllers: [NotesController],
  providers: [NoteRepository, NoteService],
  exports: [NoteService],
})
export class NoteModule {}