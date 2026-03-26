import {
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
} from "class-validator";

export class CreateQuizDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  visibility?: string; // private, public, unlisted

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  tagNames?: string[];
}
