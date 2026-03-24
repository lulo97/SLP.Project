import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiClientService } from '../../core/services/api-client.service';

export interface TagDto {
  id: number;
  name: string;
  quizCount: number;
  questionCount: number;
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private tagsCache: TagDto[] | null = null;

  constructor(private apiClient: ApiClientService) {}

  /**
   * Fetch tags from the backend.
   * @param force - if true, bypass cache and fetch fresh data.
   */
  fetchTags(force = false): Observable<TagDto[]> {
    if (this.tagsCache !== null && !force) {
      return of(this.tagsCache);
    }
    return this.apiClient.get<{ tags: TagDto[]; total: number }>('/tags', {
      params: { sort: 'name', pageSize: 100 }
    }).pipe(
      map(response => response.tags),
      tap(tags => this.tagsCache = tags)
    );
  }
}