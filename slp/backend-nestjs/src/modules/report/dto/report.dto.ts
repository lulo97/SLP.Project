import { ApiProperty } from '@nestjs/swagger';

export class ReportDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  targetType: string;

  @ApiProperty()
  targetId: number;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  resolved: boolean;

  @ApiProperty({ required: false })
  resolvedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  attemptId?: number;
}