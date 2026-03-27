import { IsString, IsInt, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportRequest {
  @ApiProperty({ description: 'Type of target (quiz, question, comment)' })
  @IsString()
  @IsIn(['quiz', 'question', 'comment'])
  targetType: string;

  @ApiProperty({ description: 'ID of the target entity' })
  @IsInt()
  targetId: number;

  @ApiProperty({ description: 'Reason for reporting' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Optional attempt ID if reporting a quiz attempt', required: false })
  @IsOptional()
  @IsInt()
  attemptId?: number;
}