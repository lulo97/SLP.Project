import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateFavoriteRequest {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  text?: string;

  @IsOptional()
  @IsString()
  @IsIn(['word', 'phrase', 'idiom', 'other'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}