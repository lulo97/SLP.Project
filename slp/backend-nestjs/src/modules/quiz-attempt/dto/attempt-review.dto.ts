import { ApiProperty } from '@nestjs/swagger';
import { AttemptDto, AttemptAnswerDto } from './attempt.dto';

export class AttemptAnswerReviewDto extends AttemptAnswerDto {
  // The base DTO already includes isCorrect, but we can add more if needed
}

export class AttemptReviewDto extends AttemptDto {
  @ApiProperty()
  quizTitle: string;

  @ApiProperty({ type: [AttemptAnswerReviewDto] })
  answerReview: AttemptAnswerReviewDto[];
}