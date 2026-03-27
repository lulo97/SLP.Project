import { ApiProperty } from '@nestjs/swagger';

export class AttemptAnswerDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  attemptId: number;

  @ApiProperty()
  quizQuestionId: number;

  @ApiProperty()
  questionSnapshotJson: string;

  @ApiProperty()
  answerJson: string;

  @ApiProperty({ nullable: true })
  isCorrect?: boolean | null;
}

export class AttemptDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  quizId: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ nullable: true })
  endTime?: Date;

  @ApiProperty({ nullable: true })
  score?: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: [AttemptAnswerDto], required: false })
  answers?: AttemptAnswerDto[];
}