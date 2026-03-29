import { IsDefined, IsObject } from 'class-validator';

export class UpdateProgressRequest {
  @IsDefined()
  @IsObject()
  lastPosition: any;
}