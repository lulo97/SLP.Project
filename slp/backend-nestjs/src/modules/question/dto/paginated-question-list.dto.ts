import { ApiProperty } from '@nestjs/swagger';
import { QuestionListDto } from './question.dto';

export class PaginatedQuestionListDto {
  @ApiProperty({ type: [QuestionListDto] })
  items: QuestionListDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;

  constructor(items: QuestionListDto[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}