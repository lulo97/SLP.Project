import { IsInt } from "class-validator";

export class AddSourceToQuizDto {
  @IsInt()
  sourceId: number;
}
