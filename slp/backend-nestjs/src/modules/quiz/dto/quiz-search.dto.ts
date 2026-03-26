export class QuizSearchDto {
  searchTerm?: string;
  userId?: number;
  visibility?: string; // "public", "unlisted"
  includeDisabled: boolean = false;
  sortBy?: string; // "createdAt", "title"
  sortOrder?: "asc" | "desc";
}
