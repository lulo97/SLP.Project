export class ExplanationDto {
  id: number;
  userId?: number;
  sourceId: number;
  textRange?: any;          // deserialized JSON object
  content: string;
  authorType: string;
  editable: boolean;
  createdAt: Date;
  updatedAt?: Date;
}