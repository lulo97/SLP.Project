import { ApiProperty } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty({ enum: ['quiz', 'question', 'source', 'favorite'] })
  resultType: string;

  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  snippet?: string | null;

  @ApiProperty()
  rank: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  subType?: string | null;

  @ApiProperty({ nullable: true })
  visibility?: string | null; // only for quiz results
}

export class CategoryCountsDto {
  @ApiProperty()
  quizzes: number;

  @ApiProperty()
  questions: number;

  @ApiProperty()
  sources: number;

  @ApiProperty()
  favorites: number;
}

export class SearchResponseDto {
  @ApiProperty()
  query: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty({ type: [SearchResultItemDto] })
  results: SearchResultItemDto[];

  @ApiProperty({ nullable: true, type: CategoryCountsDto })
  categoryCounts?: CategoryCountsDto;
}