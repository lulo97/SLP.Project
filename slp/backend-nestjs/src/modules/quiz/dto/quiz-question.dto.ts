import { Expose } from 'class-transformer';
import { IsOptional, IsInt, IsString, Min } from 'class-validator';

export class CreateQuizQuestionDto {
  @IsOptional()
  @IsInt()
  @Expose()
  originalQuestionId?: number;

  @IsOptional()
  @IsString()
  @Expose()
  questionSnapshotJson?: string;

  @IsInt()
  @Min(0)
  @Expose()
  displayOrder: number;
}

export class UpdateQuizQuestionDto {
  @IsOptional()
  @IsInt()
  @Expose()
  originalQuestionId?: number;

  @IsOptional()
  @IsString()
  @Expose()
  questionSnapshotJson?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Expose()
  displayOrder?: number;
}

// Cũng nên thêm @Expose() cho DTO response để tránh vấn đề tương tự
export class QuizQuestionDto {
  @Expose()
  id: number;

  @Expose()
  quizId: number;

  @Expose()
  originalQuestionId?: number | null;

  @Expose()
  questionSnapshotJson?: string | null;

  @Expose()
  displayOrder: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}