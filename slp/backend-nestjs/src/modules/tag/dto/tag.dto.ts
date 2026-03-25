import { ApiProperty } from '@nestjs/swagger';

export class TagDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Number of quizzes using this tag' })
  quizCount: number;

  @ApiProperty({ description: 'Number of questions using this tag' })
  questionCount: number;

  @ApiProperty({ description: 'Total usage = quizCount + questionCount' })
  totalCount: number;
}

export class TagListResponse {
  @ApiProperty({ type: [TagDto] })
  tags: TagDto[];

  @ApiProperty({ description: 'Total number of tags matching the filter (before pagination)' })
  total: number;
}