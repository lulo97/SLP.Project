import { IsString } from 'class-validator';

export class UpdateExplanationRequest {
  @IsString()
  content: string;
}