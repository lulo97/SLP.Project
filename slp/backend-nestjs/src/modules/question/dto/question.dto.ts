import { ApiProperty } from '@nestjs/swagger';

export class QuestionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false, nullable: true })
  explanation?: string | null;

  @ApiProperty({ required: false, nullable: true })
  metadataJson?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;
}

export class QuestionListDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false, nullable: true })
  explanation?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  metadataJson?: string | null;
}