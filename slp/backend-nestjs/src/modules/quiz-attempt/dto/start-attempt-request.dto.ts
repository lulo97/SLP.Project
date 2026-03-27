import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class StartAttemptRequestDto {
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  randomizeOrder?: boolean;
}