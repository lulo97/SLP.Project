import { IsOptional, IsInt, IsString } from "class-validator";

export class AddNoteToQuizDto {
  @IsOptional()
  @IsInt()
  noteId?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
