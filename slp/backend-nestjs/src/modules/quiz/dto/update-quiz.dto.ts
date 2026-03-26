import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
} from "class-validator";

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsArray()
  tagNames?: string[];

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}
