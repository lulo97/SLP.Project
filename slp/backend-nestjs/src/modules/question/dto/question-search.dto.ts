import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsInt } from 'class-validator';

export class QuestionSearchDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  userId?: number;
}