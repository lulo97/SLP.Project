import { ApiProperty } from '@nestjs/swagger';

export class AttemptQuestionDto {
  @ApiProperty()
  quizQuestionId: number;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  questionSnapshotJson: string;
}

export class StartAttemptResponseDto {
  @ApiProperty()
  attemptId: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty({ type: [AttemptQuestionDto] })
  questions: AttemptQuestionDto[];
}