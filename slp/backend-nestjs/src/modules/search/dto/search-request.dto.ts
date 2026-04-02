import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchRequestDto {
  @ApiProperty({ description: 'Full-text query string, min 1 character' })
  @IsString()
  q: string;

  @ApiProperty({ enum: ['all', 'quiz', 'question', 'source', 'favorite'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'quiz', 'question', 'source', 'favorite'])
  type?: string = 'all';

  @ApiProperty({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}