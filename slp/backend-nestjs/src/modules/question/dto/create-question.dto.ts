import { IsString, IsOptional, IsArray, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ example: 'multiple_choice', description: 'Question type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'What is the capital of France?', description: 'Question content' })
  @IsString()
  content: string;

  @ApiProperty({ required: false, description: 'Explanation for the answer' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ required: false, description: 'JSON metadata (options, correctAnswers, etc.)' })
  @IsOptional()
  @IsJSON()
  metadataJson?: string;

  @ApiProperty({ required: false, type: [String], description: 'List of tag names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];
}