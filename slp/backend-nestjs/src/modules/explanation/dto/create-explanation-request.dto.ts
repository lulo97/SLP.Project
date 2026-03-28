import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateExplanationRequest {
  @IsInt()
  sourceId: number;

  @IsOptional()
  textRange?: any;   // JSON-serializable object

  @IsString()
  content: string;
}