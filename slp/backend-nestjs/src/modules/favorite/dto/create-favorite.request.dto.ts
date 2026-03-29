import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateFavoriteRequest {
  @IsString()
  @MaxLength(255)
  text: string;

  @IsOptional()
  @IsString()
  @IsIn(['word', 'phrase', 'idiom', 'other'])
  type?: string = 'word';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}