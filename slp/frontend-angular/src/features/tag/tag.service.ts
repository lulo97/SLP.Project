import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TagDto {
  id: number;
  name: string;
}

// Response từ API
export interface TagListResponse {
  tags: TagDto[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly baseUrl = environment.apiBackendUrl;

  constructor(private http: HttpClient) {}

  fetchTags(): Observable<TagDto[]> {
    return this.http.get<TagListResponse>(`${this.baseUrl}/tags`).pipe(
      map(response => response.tags)
    );
  }
}