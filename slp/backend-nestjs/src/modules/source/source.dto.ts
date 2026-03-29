import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class SourceQueryParams {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class SourceDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  url?: string | null;
  rawText?: string | null;
  contentJson?: string | null;
  filePath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: string | null;
}

export class SourceListDto {
  id: number;
  type: string;
  title: string;
  url?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UploadSourceRequest {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class UrlSourceDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateNoteSourceRequest {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;
}

// Progress-related DTOs (minimal)
export class ProgressDto {
  sourceId: number;
  progress: number; // e.g., 0.0 – 1.0
  updatedAt: Date;
}