import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TagDto {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly baseUrl = environment.apiBackendUrl;

  constructor(private http: HttpClient) {}

  fetchTags(): Observable<TagDto[]> {
    return this.http.get<TagDto[]>(`${this.baseUrl}/tags`);
  }
}
