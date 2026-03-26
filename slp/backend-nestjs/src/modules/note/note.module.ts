import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './note.entity';
import { NoteRepository } from './note.repository';
import { NoteService } from './note.service';
import { NotesController } from './note.controller';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), SessionModule],
  controllers: [NotesController],
  providers: [NoteRepository, NoteService],
  exports: [NoteService, NoteRepository],
})
export class NoteModule {}