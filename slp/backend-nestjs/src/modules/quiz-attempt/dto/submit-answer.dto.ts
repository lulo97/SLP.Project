import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty()
  @IsInt()
  quizQuestionId: number;

  @ApiProperty()
  @IsString()
  answerJson: string;
}